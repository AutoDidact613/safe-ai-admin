import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Response, NextFunction } from "express";
import { requireApprovedOrg } from "../organizationRouter";
import * as organizationService from "../../services/organizationService";

jest.mock("../../services/organizationService", () => ({
  getOrganizationById: jest.fn(),
}));

const mockedService = jest.mocked(organizationService);

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(orgId: string, user: { userId: string; role: string }): any {
  return { params: { id: orgId }, user };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("organizationRouter.requireApprovedOrg (#217 RBAC-04)", () => {
  it("blocks an org_owner from a pending organization with 403", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      status: "pending",
    } as any);

    const req = mockReq("org-A", { userId: "owner-A", role: "org_owner" });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireApprovedOrg(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an org_owner through once the organization is approved", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      status: "approved",
    } as any);

    const req = mockReq("org-A", { userId: "owner-A", role: "org_owner" });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireApprovedOrg(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("lets an admin through regardless of organization status", async () => {
    const req = mockReq("org-A", { userId: "admin-1", role: "admin" });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireApprovedOrg(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockedService.getOrganizationById).not.toHaveBeenCalled();
  });

  it("returns 404 when the organization does not exist", async () => {
    mockedService.getOrganizationById.mockResolvedValue(null as any);

    const req = mockReq("missing-org", { userId: "owner-A", role: "org_owner" });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireApprovedOrg(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
