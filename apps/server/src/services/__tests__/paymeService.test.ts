import { describe, it, expect, jest, beforeEach } from "@jest/globals";
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
});

describe("paymeService.initiateWalletTopUp", () => {
  it("creates a pending transaction and returns the PayMe hosted-page URL on success", async () => {
    (mockedWalletRepo.createPendingTransaction as jest.Mock).mockResolvedValue({
      requestId: "req1",
    } as never);
    (mockedPaymeClient.generateSale as jest.Mock).mockResolvedValue({
      success: true,
      iframeUrl: "https://sandbox.payme.io/sale/generate/xxx",
    } as never);

    const result = await paymeService.initiateWalletTopUp("org1", 100, "ILS");

    expect(result.success).toBe(true);
    expect(result.iframeUrl).toContain("sandbox.payme.io");
    expect(mockedWalletRepo.markFailedIfPending).not.toHaveBeenCalled();
  });

  it("rejects amounts below PayMe's minimum sale price without calling PayMe", async () => {
    const result = await paymeService.initiateWalletTopUp("org1", 1, "ILS");

    expect(result.success).toBe(false);
    expect(mockedWalletRepo.createPendingTransaction).not.toHaveBeenCalled();
    expect(mockedPaymeClient.generateSale).not.toHaveBeenCalled();
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
  it("rejects a callback with no payme_signature field", () => {
    expect(paymeService.verifyWebhookSignature({})).toBe(false);
  });

  it("rejects a callback even with a payme_signature present (verification not yet implemented - fails closed)", () => {
    expect(paymeService.verifyWebhookSignature({ payme_signature: "75e99dbcb25cdfbe1c62f0b9376f4144" })).toBe(
      false
    );
  });
});

describe("paymeService.processWalletTopUpWebhook", () => {
  const pendingTransaction = {
    organizationId: { toString: () => "org1" },
    requestId: "req1",
    amount: 100,
    status: "pending",
  };

  it("credits the wallet atomically when the callback reports sale-complete with the correct amount", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(pendingTransaction as never);
    (mockedWalletRepo.markCompletedIfPending as jest.Mock).mockResolvedValue({
      ...pendingTransaction,
      status: "completed",
    } as never);

    const result = await paymeService.processWalletTopUpWebhook({
      status_code: "0",
      notify_type: "sale-complete",
      payme_transaction_id: "TRANXXXX",
      price: 10000, // agorot -> 100 ILS
      transaction_id: "req1",
    });

    expect(result.handled).toBe(true);
    expect(mockedOrgRepo.incrementWalletBalance).toHaveBeenCalledWith("org1", 100);
  });

  it("rejects and does not credit the wallet when the amount does not match the initiated amount", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(pendingTransaction as never);

    const result = await paymeService.processWalletTopUpWebhook({
      status_code: "0",
      notify_type: "sale-complete",
      payme_transaction_id: "TRANXXXX",
      price: 99900, // 999 ILS, not the requested 100
      transaction_id: "req1",
    });

    expect(result.handled).toBe(false);
    expect(mockedWalletRepo.markFailedIfPending).toHaveBeenCalled();
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("does not credit the wallet twice for a duplicate callback delivery of the same transaction", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue({
      ...pendingTransaction,
      status: "completed",
    } as never);

    const result = await paymeService.processWalletTopUpWebhook({
      status_code: "0",
      notify_type: "sale-complete",
      payme_transaction_id: "TRANXXXX",
      price: 10000,
      transaction_id: "req1",
    });

    expect(result.handled).toBe(true);
    expect(mockedWalletRepo.markCompletedIfPending).not.toHaveBeenCalled();
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("does not credit the wallet if it lost the race to a concurrent delivery (atomic guard returns null)", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(pendingTransaction as never);
    (mockedWalletRepo.markCompletedIfPending as jest.Mock).mockResolvedValue(null as never);

    const result = await paymeService.processWalletTopUpWebhook({
      status_code: "0",
      notify_type: "sale-complete",
      payme_transaction_id: "TRANXXXX",
      price: 10000,
      transaction_id: "req1",
    });

    expect(result.handled).toBe(true);
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("marks the transaction failed and does not credit the wallet when PayMe reports sale-failure", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(pendingTransaction as never);

    const result = await paymeService.processWalletTopUpWebhook({
      status_code: "1",
      notify_type: "sale-failure",
      price: 10000,
      transaction_id: "req1",
    });

    expect(result.handled).toBe(true);
    expect(mockedWalletRepo.markFailedIfPending).toHaveBeenCalled();
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("rejects a callback for an unknown transaction_id", async () => {
    (mockedWalletRepo.findByRequestId as jest.Mock).mockResolvedValue(null as never);

    const result = await paymeService.processWalletTopUpWebhook({
      status_code: "0",
      notify_type: "sale-complete",
      price: 10000,
      transaction_id: "does-not-exist",
    });

    expect(result.handled).toBe(false);
    expect(mockedOrgRepo.incrementWalletBalance).not.toHaveBeenCalled();
  });

  it("rejects a callback with no transaction_id", async () => {
    const result = await paymeService.processWalletTopUpWebhook({
      status_code: "0",
      notify_type: "sale-complete",
      price: 10000,
    });

    expect(result.handled).toBe(false);
    expect(mockedWalletRepo.findByRequestId).not.toHaveBeenCalled();
  });
});
