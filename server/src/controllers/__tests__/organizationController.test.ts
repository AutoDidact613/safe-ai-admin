import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Request, Response } from "express";
import { getOrganizationUsersHandler } from "../organizationController";
import * as organizationService from "../../services/organizationService";

jest.mock("../../services/organizationService", () => ({
  getOrganizationById: jest.fn(),
  getOrganizationUsers: jest.fn(),
}));

const mockedService = jest.mocked(organizationService);

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(orgId: string, user: { userId: string; role: string }): Request<{ id: string }> {
  return { params: { id: orgId }, user } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("organizationController.getOrganizationUsersHandler", () => {
  it("returns 403 when an org_owner requests users of a different organization", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);

    const req = mockReq("org-B", { userId: "owner-A", role: "org_owner" });
    const res = mockRes();

    await getOrganizationUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(mockedService.getOrganizationUsers).not.toHaveBeenCalled();
  });

  it("returns 403 when ownerId is a populated object belonging to a different owner", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: { _id: "owner-B", name: "Owner B" },
    } as any);

    const req = mockReq("org-B", { userId: "owner-A", role: "org_owner" });
    const res = mockRes();

    await getOrganizationUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedService.getOrganizationUsers).not.toHaveBeenCalled();
  });

  it("returns the users when the org_owner owns the requested organization", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);
    mockedService.getOrganizationUsers.mockResolvedValue([{ _id: "u1" }] as any);

    const req = mockReq("org-A", { userId: "owner-A", role: "org_owner" });
    const res = mockRes();

    await getOrganizationUsersHandler(req, res);

    expect(mockedService.getOrganizationUsers).toHaveBeenCalledWith("org-A");
    expect(res.json).toHaveBeenCalledWith([{ _id: "u1" }]);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it("allows an admin to access any organization's users", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);
    mockedService.getOrganizationUsers.mockResolvedValue([]);

    const req = mockReq("org-B", { userId: "admin-1", role: "admin" });
    const res = mockRes();

    await getOrganizationUsersHandler(req, res);

    expect(mockedService.getOrganizationUsers).toHaveBeenCalledWith("org-B");
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it("returns 404 when the organization does not exist", async () => {
    mockedService.getOrganizationById.mockResolvedValue(null as any);

    const req = mockReq("missing-org", { userId: "owner-A", role: "org_owner" });
    const res = mockRes();

    await getOrganizationUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedService.getOrganizationUsers).not.toHaveBeenCalled();
  });
});
