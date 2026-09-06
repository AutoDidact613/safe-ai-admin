import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as repo from "../walletTransactionRepository";
import { WalletTransaction } from "../../models/walletTransaction";

jest.mock("../../models/walletTransaction", () => ({
  WalletTransaction: {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

const mockedWalletTransaction = jest.mocked(WalletTransaction, { shallow: true });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("walletTransactionRepository.createPendingTransaction", () => {
  it("creates a transaction in pending status", async () => {
    (mockedWalletTransaction.create as jest.Mock).mockResolvedValue({
      _id: "tx1",
      status: "pending",
    } as never);

    await repo.createPendingTransaction({
      organizationId: "org1",
      requestId: "req1",
      amount: 100,
    });

    expect(mockedWalletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org1",
        requestId: "req1",
        amount: 100,
        status: "pending",
      })
    );
  });
});

describe("walletTransactionRepository.markCompletedIfPending", () => {
  it("only updates a transaction that is still pending, and sets completed fields", async () => {
    const leanMock = jest.fn().mockResolvedValue({
      _id: "tx1",
      status: "completed",
    } as never);
    (mockedWalletTransaction.findOneAndUpdate as jest.Mock).mockReturnValue({
      lean: leanMock,
    } as never);

    const result = await repo.markCompletedIfPending("req1", "payme-tx-1", { raw: true });

    expect(mockedWalletTransaction.findOneAndUpdate).toHaveBeenCalledWith(
      { requestId: "req1", status: "pending" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "completed",
          payMeTransactionId: "payme-tx-1",
        }),
      }),
      { new: true }
    );
    expect(result).toEqual({ _id: "tx1", status: "completed" });
  });

  it("returns null (does not credit again) when the transaction was already resolved", async () => {
    const leanMock = jest.fn().mockResolvedValue(null as never);
    (mockedWalletTransaction.findOneAndUpdate as jest.Mock).mockReturnValue({
      lean: leanMock,
    } as never);

    const result = await repo.markCompletedIfPending("req1", "payme-tx-1", { raw: true });

    expect(result).toBeNull();
  });
});

describe("walletTransactionRepository.markFailedIfPending", () => {
  it("only updates a transaction that is still pending", async () => {
    const leanMock = jest.fn().mockResolvedValue({
      _id: "tx1",
      status: "failed",
    } as never);
    (mockedWalletTransaction.findOneAndUpdate as jest.Mock).mockReturnValue({
      lean: leanMock,
    } as never);

    const result = await repo.markFailedIfPending("req1", { raw: true });

    expect(mockedWalletTransaction.findOneAndUpdate).toHaveBeenCalledWith(
      { requestId: "req1", status: "pending" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "failed" }),
      }),
      { new: true }
    );
    expect(result).toEqual({ _id: "tx1", status: "failed" });
  });
});
