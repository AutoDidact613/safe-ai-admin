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
  it("rejects with 401 and never touches the DB when the signature is missing or invalid", async () => {
    (mockedPaymeService.verifyWebhookSignature as jest.Mock).mockReturnValue(false as never);

    const req: any = {
      headers: {},
      rawBody: "{}",
      body: {},
    };
    const res = mockRes();

    await paymeWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedPaymeService.processWalletTopUpWebhook).not.toHaveBeenCalled();
  });

  it("rejects with 401 when rawBody was never captured (e.g. unexpected content-type)", async () => {
    const req: any = {
      headers: { "x-payme-signature": "deadbeef" },
      rawBody: undefined,
      body: {},
    };
    const res = mockRes();

    await paymeWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedPaymeService.verifyWebhookSignature).not.toHaveBeenCalled();
    expect(mockedPaymeService.processWalletTopUpWebhook).not.toHaveBeenCalled();
  });

  it("processes the webhook once the signature is valid", async () => {
    (mockedPaymeService.verifyWebhookSignature as jest.Mock).mockReturnValue(true as never);
    (mockedPaymeService.processWalletTopUpWebhook as jest.Mock).mockResolvedValue({
      handled: true,
    } as never);

    const req: any = {
      headers: { "x-payme-signature": "deadbeef" },
      rawBody: "{}",
      body: { StatusCode: "0" },
    };
    const res = mockRes();

    await paymeWebhookHandler(req, res);

    expect(mockedPaymeService.processWalletTopUpWebhook).toHaveBeenCalledWith(req.body);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
