import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Response, NextFunction } from "express";
import { rateLimiter } from "../rateLimiter";
import { UsageLog } from "../../models";
import { checkAndResetMonthlyBudget } from "../../services/usageTracker";

jest.mock("../../models", () => ({
  UsageLog: { countDocuments: jest.fn() },
}));
jest.mock("../../services/usageTracker", () => ({
  checkAndResetMonthlyBudget: jest.fn(),
}));

const mockedUsageLog = jest.mocked(UsageLog);
const mockedCheckReset = jest.mocked(checkAndResetMonthlyBudget);

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(user: any): any {
  return { user };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedCheckReset.mockResolvedValue(undefined);
  mockedUsageLog.countDocuments.mockResolvedValue(0 as any);
});

describe("rateLimiter (#236 ORG-09 — MANAGED monthly budget enforcement)", () => {
  it("blocks the request with 402 when a MANAGED user has reached their monthly budget", async () => {
    const req = mockReq({
      _id: "user-1",
      mode: "MANAGED",
      costLimits: { monthlyBudget: 10, currentMonthSpent: 10 },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Budget exceeded" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks the request when spending has exceeded (not just reached) the budget", async () => {
    const req = mockReq({
      _id: "user-1",
      mode: "MANAGED",
      costLimits: { monthlyBudget: 10, currentMonthSpent: 15 },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows the request through when a MANAGED user is still under budget", async () => {
    const req = mockReq({
      _id: "user-1",
      mode: "MANAGED",
      costLimits: { monthlyBudget: 10, currentMonthSpent: 5 },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await rateLimiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(402);
  });

  it("does not apply the budget check to a BYOK user", async () => {
    const req = mockReq({
      _id: "user-1",
      mode: "BYOK",
      costLimits: { monthlyBudget: 10, currentMonthSpent: 999 },
    });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await rateLimiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(402);
  });

  it("returns 401 when there is no authenticated user", async () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
