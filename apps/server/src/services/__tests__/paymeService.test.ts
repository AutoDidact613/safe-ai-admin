import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import crypto from "crypto";
import * as paymeService from "../paymeService";
import * as walletTransactionRepo from "../../repositories/walletTransactionRepository";
import * as organizationRepo from "../../repositories/organizationRepository";
import * as paymeClient from "../paymeClient";

jest.mock("../../repositories/walletTransactionRepository");
jest.mock("../../repositories/organizationRepository");
jest.mock("../paymeClient");

const mockedWalletRepo = jest.mocked(walletTransactionRepo);
const mockedOrgRepo = jest.mocked(organizationRepo);
const mockedPaymeClient = jest.mocked(paymeClient);

beforeEach(() => {
  jest.clearAllMocks();
  process.env.PAYME_WEBHOOK_SECRET = "test-secret";
});

describe("paymeService.initiateWalletTopUp", () => {
  it("creates a pending transaction and returns the PayMe iframe URL on success", async () => {
    (mockedWalletRepo.createPendingTransaction as jest.Mock).mockResolvedValue({
      requestId: "req1",
    } as never);
    (mockedPaymeClient.generateSale as jest.Mock).mockResolvedValue({
      success: true,
      iframeUrl: "https://sandbox.paymeservice.com/api/generate-sale?x=1",
    } as never);

    const result = await paymeService.initiateWalletTopUp("org1", 100, "ILS");

    expect(result.success).toBe(true);
    expect(result.iframeUrl).toContain("generate-sale");
    expect(mockedWalletRepo.markFailedIfPending).not.toHaveBeenCalled();
  });

  it("marks the transaction failed and returns an error when PayMe generate-sale fails", async () => {
    (mockedWalletRepo.createPendingTransaction as jest.Mock).mockResolvedValue({
      requestId: "req1",
    } as never);
    (mockedPaymeClient.generateSale as jest.Mock).mockResolvedValue({
      success: false,
      error: "PayMe unreachable",
    } as never);

    const result = await paymeService.initiateWalletTopUp("org1", 100, "ILS");

    expect(result.success).toBe(false);
    expect(mockedWalletRepo.markFailedIfPending).toHaveBeenCalled();
  });
});

describe("paymeService.verifyWebhookSignature", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ StatusCode: "0", TransactionId: "tx1" });

  function sign(payload: string) {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  it("rejects a request with no signature header", () => {
    expect(paymeService.verifyWebhookSignature(body, undefined)).toBe(false);
  });

  it("rejects a request with an invalid signature", () => {
    expect(paymeService.verifyWebhookSignature(body, "0".repeat(64))).toBe(false);
  });

  it("rejects a request signed with a different secret (tampered body / wrong signer)", () => {
    const wrongSignature = crypto.createHmac("sha256", "wrong-secret").update(body).digest("hex");
    expect(paymeService.verifyWebhookSignature(body, wrongSignature)).toBe(false);
  });

  it("accepts a request with a valid signature over the exact raw body", () => {
    expect(paymeService.verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects when PAYME_WEBHOOK_SECRET is not configured (fail closed)", () => {
    delete process.env.PAYME_WEBHOOK_SECRET;
    expect(paymeService.verifyWebhookSignature(body, sign(body))).toBe(false);
  });
});

describe("paymeService.processWalletTopUpWebhook", () => {
  const pendingTransaction = {
    organizationId: { toString: () => "org1" },
    requestId: "req1",
    amount: 100,
    status: "pending",
  };

  it("credits the wallet atomically when the webhook reports success with the correct amount", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(pendingTransaction as never);
    (mockedWalletRepo.markCompletedIfPending as jest.Mock).mockResolvedValue({
      ...pendingTransaction,
      status: "completed",
    } as never);

    const result = await paymeService.processWalletTopUpWebhook({
      StatusCode: "0",
      TransactionId: "payme-tx-1",
      Amount: 100,
      MoreData: JSON.stringify({ requestId: "req1" }),
    });

    expect(result.handled).toBe(true);
    expect(mockedOrgRepo.incrementWalletBalance).toHaveBeenCalledWith("org1", 100);
  });

  it("rejects and does not credit the wallet when the amount does not match the initiated amount", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(pendingTransaction as never);

    const result = await paymeService.processWalletTopUpWebhook({
      StatusCode: "0",
      TransactionId: "payme-tx-1",
      Amount: 999,
      MoreData: JSON.stringify({ requestId: "req1" }),
    });

    expect(result.handled).toBe(false);
    expect(mockedWalletRepo.markFailedIfPending).toHaveBeenCalled();
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("does not credit the wallet twice for a duplicate webhook delivery of the same transaction", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue({
      ...pendingTransaction,
      status: "completed",
    } as never);

    const result = await paymeService.processWalletTopUpWebhook({
      StatusCode: "0",
      TransactionId: "payme-tx-1",
      Amount: 100,
      MoreData: JSON.stringify({ requestId: "req1" }),
    });

    expect(result.handled).toBe(true);
    expect(mockedWalletRepo.markCompletedIfPending).not.toHaveBeenCalled();
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("does not credit the wallet if it lost the race to a concurrent delivery (atomic guard returns null)", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(pendingTransaction as never);
    (mockedWalletRepo.markCompletedIfPending as jest.Mock).mockResolvedValue(null as never);

    const result = await paymeService.processWalletTopUpWebhook({
      StatusCode: "0",
      TransactionId: "payme-tx-1",
      Amount: 100,
      MoreData: JSON.stringify({ requestId: "req1" }),
    });

    expect(result.handled).toBe(true);
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("marks the transaction failed and does not credit the wallet when PayMe reports a non-success StatusCode", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(pendingTransaction as never);

    const result = await paymeService.processWalletTopUpWebhook({
      StatusCode: "1",
      TransactionId: "payme-tx-1",
      Amount: 100,
      MoreData: JSON.stringify({ requestId: "req1" }),
    });

    expect(result.handled).toBe(true);
    expect(mockedWalletRepo.markFailedIfPending).toHaveBeenCalled();
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("rejects a webhook for an unknown requestId", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(null as never);

    const result = await paymeService.processWalletTopUpWebhook({
      StatusCode: "0",
      Amount: 100,
      MoreData: JSON.stringify({ requestId: "does-not-exist" }),
    });

    expect(result.handled).toBe(false);
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });
});
