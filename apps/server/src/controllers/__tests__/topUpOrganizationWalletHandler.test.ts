import { describe, it, expect, jest, afterEach } from "@jest/globals";
import { topUpOrganizationWalletHandler } from "../organizationController";
import * as organizationService from "../../services/organizationService";

jest.mock("../../services/organizationService");

const mockedOrganizationService = jest.mocked(organizationService);

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  jest.clearAllMocks();
});

describe("organizationController.topUpOrganizationWalletHandler - production guard", () => {
  it("returns 404 in production without touching the DB", async () => {
    process.env.NODE_ENV = "production";

    const req: any = {
      params: { id: "org1" },
      body: { amount: 100 },
      user: { userId: "owner1", role: "admin" },
    };
    const res = mockRes();

    await topUpOrganizationWalletHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedOrganizationService.getOrganizationById).not.toHaveBeenCalled();
    expect(mockedOrganizationService.topUpOrganizationWallet).not.toHaveBeenCalled();
  });

  it("still works outside production", async () => {
    process.env.NODE_ENV = "test";
    const org = { _id: "org1", ownerId: "owner1" };
    (mockedOrganizationService.getOrganizationById as jest.Mock).mockResolvedValue(org as never);
    (mockedOrganizationService.topUpOrganizationWallet as jest.Mock).mockResolvedValue(org as never);

    const req: any = {
      params: { id: "org1" },
      body: { amount: 100 },
      user: { userId: "owner1", role: "admin" },
    };
    const res = mockRes();

    await topUpOrganizationWalletHandler(req, res);

    expect(mockedOrganizationService.topUpOrganizationWallet).toHaveBeenCalledWith("org1", 100);
    expect(res.status).not.toHaveBeenCalledWith(404);
  });
});
