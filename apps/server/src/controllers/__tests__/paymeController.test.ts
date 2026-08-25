import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { paymeWebhookHandler } from "../paymeController";
import * as paymeService from "../../services/paymeService";

jest.mock("../../services/paymeService");
jest.mock("../../services/organizationService", () => ({
  getOrganizationById: jest.fn(),
}));

const mockedPaymeService = jest.mocked(paymeService);

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
