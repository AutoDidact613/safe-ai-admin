import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { paymeWebhookHandler, initiatePaymeTopUpHandler } from "../paymeController";
import * as paymeService from "../../services/paymeService";
import * as organizationService from "../../services/organizationService";

jest.mock("../../services/paymeService");
jest.mock("../../services/organizationService", () => ({
  getOrganizationById: jest.fn(),
}));

const mockedPaymeService = jest.mocked(paymeService);
const mockedOrganizationService = jest.mocked(organizationService);

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("paymeController.paymeWebhookHandler", () => {
  it("rejects with 401 and never touches the DB when the signature does not verify", async () => {
    (mockedPaymeService.verifyWebhookSignature as jest.Mock).mockReturnValue(false as never);

    const req: any = {
      body: { status_code: "0" },
    };
    const res = mockRes();

    await paymeWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedPaymeService.processWalletTopUpWebhook).not.toHaveBeenCalled();
  });

  it("processes the webhook once the signature verifies", async () => {
    (mockedPaymeService.verifyWebhookSignature as jest.Mock).mockReturnValue(true as never);
    (mockedPaymeService.processWalletTopUpWebhook as jest.Mock).mockResolvedValue({
      handled: true,
    } as never);

    const req: any = {
      body: { status_code: "0", notify_type: "sale-complete" },
    };
    const res = mockRes();

    await paymeWebhookHandler(req, res);

    expect(mockedPaymeService.processWalletTopUpWebhook).toHaveBeenCalledWith(req.body);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe("paymeController.initiatePaymeTopUpHandler - authorization (isAdminOrOwner)", () => {
  const org = { _id: "org1", ownerId: "owner1" };

  function mockReq(userOverrides: Record<string, unknown>) {
    return {
      params: { id: "org1" },
      body: { amount: 100, currency: "ILS" },
      user: { userId: "owner1", role: "user", ...userOverrides },
    } as any;
  }

  it("allows a system admin to initiate a top-up even if they don't own the organization", async () => {
    (mockedOrganizationService.getOrganizationById as jest.Mock).mockResolvedValue(org as never);
    (mockedPaymeService.initiateWalletTopUp as jest.Mock).mockResolvedValue({
      success: true,
      iframeUrl: "https://sandbox.payme.io/x",
      requestId: "req1",
    } as never);

    const req = mockReq({ userId: "some-other-admin", role: "admin" });
    const res = mockRes();

    await initiatePaymeTopUpHandler(req, res);

    expect(mockedPaymeService.initiateWalletTopUp).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it("allows the organization's own owner to initiate a top-up", async () => {
    (mockedOrganizationService.getOrganizationById as jest.Mock).mockResolvedValue(org as never);
    (mockedPaymeService.initiateWalletTopUp as jest.Mock).mockResolvedValue({
      success: true,
      iframeUrl: "https://sandbox.payme.io/x",
      requestId: "req1",
    } as never);

    const req = mockReq({ userId: "owner1", role: "user" });
    const res = mockRes();

    await initiatePaymeTopUpHandler(req, res);

    expect(mockedPaymeService.initiateWalletTopUp).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it("rejects a non-admin, non-owner user with 403 and never calls the PayMe service", async () => {
    (mockedOrganizationService.getOrganizationById as jest.Mock).mockResolvedValue(org as never);

    const req = mockReq({ userId: "some-random-user", role: "user" });
    const res = mockRes();

    await initiatePaymeTopUpHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedPaymeService.initiateWalletTopUp).not.toHaveBeenCalled();
  });

  it("returns 404 without calling the PayMe service when the organization doesn't exist", async () => {
    (mockedOrganizationService.getOrganizationById as jest.Mock).mockResolvedValue(null as never);

    const req = mockReq({ userId: "owner1", role: "user" });
    const res = mockRes();

    await initiatePaymeTopUpHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPaymeService.initiateWalletTopUp).not.toHaveBeenCalled();
  });
});

describe("paymeController.initiatePaymeTopUpHandler - currency validation", () => {
  function mockReq(body: Record<string, unknown>) {
    return {
      params: { id: "org1" },
      body,
      user: { userId: "owner1", role: "admin" },
    } as any;
  }

  it("rejects an unsupported currency with 400 and never calls the PayMe service", async () => {
    const req = mockReq({ amount: 100, currency: "USD" });
    const res = mockRes();

    await initiatePaymeTopUpHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedOrganizationService.getOrganizationById).not.toHaveBeenCalled();
    expect(mockedPaymeService.initiateWalletTopUp).not.toHaveBeenCalled();
  });

  it("allows a request with no currency field (service applies the ILS default)", async () => {
    const org = { _id: "org1", ownerId: "owner1" };
    (mockedOrganizationService.getOrganizationById as jest.Mock).mockResolvedValue(org as never);
    (mockedPaymeService.initiateWalletTopUp as jest.Mock).mockResolvedValue({
      success: true,
      iframeUrl: "https://sandbox.payme.io/x",
      requestId: "req1",
    } as never);

    const req = mockReq({ amount: 100 });
    const res = mockRes();

    await initiatePaymeTopUpHandler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(mockedPaymeService.initiateWalletTopUp).toHaveBeenCalled();
  });
});
