import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Request, Response } from "express";
import {
  getOrganizationUsersHandler,
  updateOrganizationHandler,
  publicRequestOrganizationHandler,
  topUpOrganizationWalletHandler,
  approveOrganizationHandler,
  rejectOrganizationHandler,
  suspendOrganizationHandler,
  activateOrganizationHandler,
  addUserToOrganizationHandler,
  removeUserFromOrganizationHandler,
  createOrganizationMemberHandler,
  addOrganizationProviderKeyHandler,
  listOrganizationProviderKeysHandler,
  deleteOrganizationProviderKeyHandler,
  getPendingOrganizationsHandler,
} from "../organizationController";
import * as organizationService from "../../services/organizationService";

jest.mock("../../services/organizationService", () => ({
  getOrganizationById: jest.fn(),
  getOrganizationUsers: jest.fn(),
  updateOrganization: jest.fn(),
  publicRequestOrganization: jest.fn(),
  topUpOrganizationWallet: jest.fn(),
  approveOrganization: jest.fn(),
  addUserToOrganization: jest.fn(),
  getOrganizationForUser: jest.fn(),
  removeUserFromOrganization: jest.fn(),
  rejectOrganization: jest.fn(),
  setOrganizationActive: jest.fn(),
  createOrganizationMember: jest.fn(),
  addOrganizationProviderKey: jest.fn(),
  listOrganizationProviderKeys: jest.fn(),
  deleteOrganizationProviderKey: jest.fn(),
  getPendingOrganizationsForAdmin: jest.fn(),
}));

const mockedService = jest.mocked(organizationService);

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(orgId: string, user: { userId: string; role: string }, body: any = {}): Request<{ id: string }> {
  return { params: { id: orgId }, user, body } as any;
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

describe("organizationController.updateOrganizationHandler", () => {
  it("strips walletBalance, ownerId and isActive when a non-admin owner updates their organization", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);
    mockedService.updateOrganization.mockResolvedValue({ _id: "org-A" } as any);

    const req = mockReq("org-A", { userId: "owner-A", role: "org_owner" }, {
      name: "New Name",
      description: "New description",
      walletBalance: 999999,
      ownerId: "attacker-id",
      isActive: true,
      status: "approved",
    });
    const res = mockRes();

    await updateOrganizationHandler(req, res);

    expect(mockedService.updateOrganization).toHaveBeenCalledWith("org-A", {
      name: "New Name",
      description: "New description",
    });
  });

  it("returns 403 when an org_owner tries to update a different organization", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);

    const req = mockReq("org-B", { userId: "owner-A", role: "org_owner" }, {
      walletBalance: 999999,
    });
    const res = mockRes();

    await updateOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedService.updateOrganization).not.toHaveBeenCalled();
  });

  it("allows an admin to update any field, including walletBalance and ownerId", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);
    mockedService.updateOrganization.mockResolvedValue({ _id: "org-B" } as any);

    const req = mockReq("org-B", { userId: "admin-1", role: "admin" }, {
      walletBalance: 999999,
      ownerId: "new-owner",
    });
    const res = mockRes();

    await updateOrganizationHandler(req, res);

    expect(mockedService.updateOrganization).toHaveBeenCalledWith("org-B", {
      walletBalance: 999999,
      ownerId: "new-owner",
    });
  });
});

describe("organizationController.publicRequestOrganizationHandler", () => {
  it("rejects the request instead of creating an organization when the owner email is invalid", async () => {
    mockedService.publicRequestOrganization.mockRejectedValue(
      new Error("כתובת האימייל אינה תקינה")
    );

    const req = {
      body: {
        ownerName: "Owner",
        ownerEmail: "not-an-email",
        ownerPassword: "secret123",
        orgName: "Acme",
      },
    } as any;
    const res = mockRes();

    await publicRequestOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "כתובת האימייל אינה תקינה" })
    );
    expect(res.status).not.toHaveBeenCalledWith(201);
  });

  it("creates the organization when the request is valid", async () => {
    mockedService.publicRequestOrganization.mockResolvedValue({ _id: "org-1" } as any);

    const req = {
      body: {
        ownerName: "Owner",
        ownerEmail: "owner@example.com",
        ownerPassword: "secret123",
        orgName: "Acme",
      },
    } as any;
    const res = mockRes();

    await publicRequestOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("organizationController.topUpOrganizationWalletHandler", () => {
  it.each([0, -50, -0.01])(
    "rejects a top-up amount of %p with 400 and does not touch the wallet",
    async (amount) => {
      const req = { params: { id: "org-A" }, user: { userId: "owner-A", role: "org_owner" }, body: { amount } } as any;
      const res = mockRes();

      await topUpOrganizationWalletHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockedService.getOrganizationById).not.toHaveBeenCalled();
      expect(mockedService.topUpOrganizationWallet).not.toHaveBeenCalled();
    }
  );

  it("rejects a non-numeric amount with 400", async () => {
    const req = { params: { id: "org-A" }, user: { userId: "owner-A", role: "org_owner" }, body: { amount: "100" } } as any;
    const res = mockRes();

    await topUpOrganizationWalletHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedService.topUpOrganizationWallet).not.toHaveBeenCalled();
  });

  it("tops up the wallet for a valid positive amount when the org_owner owns the organization", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);
    mockedService.topUpOrganizationWallet.mockResolvedValue({ _id: "org-A", walletBalance: 150 } as any);

    const req = { params: { id: "org-A" }, user: { userId: "owner-A", role: "org_owner" }, body: { amount: 50 } } as any;
    const res = mockRes();

    await topUpOrganizationWalletHandler(req, res);

    expect(mockedService.topUpOrganizationWallet).toHaveBeenCalledWith("org-A", 50);
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it("returns 403 when an org_owner tries to top up a different organization's wallet", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);

    const req = { params: { id: "org-B" }, user: { userId: "owner-A", role: "org_owner" }, body: { amount: 50 } } as any;
    const res = mockRes();

    await topUpOrganizationWalletHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedService.topUpOrganizationWallet).not.toHaveBeenCalled();
  });
});

describe("organizationController.approveOrganizationHandler (#229 ORG-02)", () => {
  it("approves a pending organization and returns the updated organization", async () => {
    mockedService.approveOrganization.mockResolvedValue({
      _id: "org-A",
      status: "approved",
      isActive: true,
    } as any);

    const req = { params: { id: "org-A" } } as any;
    const res = mockRes();

    await approveOrganizationHandler(req, res);

    expect(mockedService.approveOrganization).toHaveBeenCalledWith("org-A", undefined);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        organization: expect.objectContaining({ status: "approved", isActive: true }),
      })
    );
  });

  it("passes the acting admin's email through so other admins can be notified", async () => {
    mockedService.approveOrganization.mockResolvedValue({ _id: "org-A" } as any);

    const req = { params: { id: "org-A" }, user: { email: "admin1@safeai.com" } } as any;
    const res = mockRes();

    await approveOrganizationHandler(req, res);

    expect(mockedService.approveOrganization).toHaveBeenCalledWith("org-A", "admin1@safeai.com");
  });

  it("returns 400 when the organization is not pending", async () => {
    mockedService.approveOrganization.mockRejectedValue(
      new Error("ניתן לאשר רק ארגון שממתין לאישור")
    );

    const req = { params: { id: "org-A" } } as any;
    const res = mockRes();

    await approveOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "ניתן לאשר רק ארגון שממתין לאישור" })
    );
  });
});

describe("organizationController.rejectOrganizationHandler (#230 ORG-03)", () => {
  it("rejects a pending organization and returns the updated organization", async () => {
    mockedService.rejectOrganization.mockResolvedValue({
      _id: "org-A",
      status: "rejected",
      isActive: false,
    } as any);

    const req = { params: { id: "org-A" } } as any;
    const res = mockRes();

    await rejectOrganizationHandler(req, res);

    expect(mockedService.rejectOrganization).toHaveBeenCalledWith("org-A", undefined);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        organization: expect.objectContaining({ status: "rejected" }),
      })
    );
  });

  it("returns 400 when the organization is not pending", async () => {
    mockedService.rejectOrganization.mockRejectedValue(
      new Error("ניתן לדחות רק ארגון שממתין לאישור")
    );

    const req = { params: { id: "org-A" } } as any;
    const res = mockRes();

    await rejectOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("organizationController.suspend/activateOrganizationHandler (#231 ORG-04)", () => {
  it("suspends an active approved organization", async () => {
    mockedService.setOrganizationActive.mockResolvedValue({
      _id: "org-A",
      isActive: false,
    } as any);

    const req = { params: { id: "org-A" } } as any;
    const res = mockRes();

    await suspendOrganizationHandler(req, res);

    expect(mockedService.setOrganizationActive).toHaveBeenCalledWith("org-A", false, undefined);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, organization: expect.objectContaining({ isActive: false }) })
    );
  });

  it("returns 400 when suspending an organization that isn't approved", async () => {
    mockedService.setOrganizationActive.mockRejectedValue(
      new Error("ניתן להשעות או להפעיל מחדש רק ארגון מאושר")
    );

    const req = { params: { id: "org-A" } } as any;
    const res = mockRes();

    await suspendOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("reactivates a suspended organization", async () => {
    mockedService.setOrganizationActive.mockResolvedValue({
      _id: "org-A",
      isActive: true,
    } as any);

    const req = { params: { id: "org-A" } } as any;
    const res = mockRes();

    await activateOrganizationHandler(req, res);

    expect(mockedService.setOrganizationActive).toHaveBeenCalledWith("org-A", true, undefined);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, organization: expect.objectContaining({ isActive: true }) })
    );
  });
});

describe("organizationController.addUserToOrganizationHandler (#232 ORG-05)", () => {
  it("adds a user when the org_owner owns the organization", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);

    const req = {
      params: { id: "org-A" },
      user: { userId: "owner-A", role: "org_owner" },
      body: { userId: "user-1", role: "user" },
    } as any;
    const res = mockRes();

    await addUserToOrganizationHandler(req, res);

    expect(mockedService.addUserToOrganization).toHaveBeenCalledWith("org-A", "user-1", "user");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("returns 403 when an org_owner tries to add a user to a different organization", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);

    const req = {
      params: { id: "org-B" },
      user: { userId: "owner-A", role: "org_owner" },
      body: { userId: "user-1" },
    } as any;
    const res = mockRes();

    await addUserToOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedService.addUserToOrganization).not.toHaveBeenCalled();
  });

  it("returns 400 when the organization already reached its maxUsers limit", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);
    mockedService.addUserToOrganization.mockRejectedValue(
      new Error("הארגון הגיע למספר המשתמשים המרבי המותר (10)")
    );

    const req = {
      params: { id: "org-A" },
      user: { userId: "owner-A", role: "org_owner" },
      body: { userId: "user-1" },
    } as any;
    const res = mockRes();

    await addUserToOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("organizationController.removeUserFromOrganizationHandler (#233 ORG-06)", () => {
  it("removes a user when the org_owner owns the target user's organization", async () => {
    mockedService.getOrganizationForUser.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);

    const req = {
      params: { userId: "user-1" },
      user: { userId: "owner-A", role: "org_owner" },
    } as any;
    const res = mockRes();

    await removeUserFromOrganizationHandler(req, res);

    expect(mockedService.removeUserFromOrganization).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("returns 403 when an org_owner tries to remove a user from a different organization (IDOR)", async () => {
    mockedService.getOrganizationForUser.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);

    const req = {
      params: { userId: "user-1" },
      user: { userId: "owner-A", role: "org_owner" },
    } as any;
    const res = mockRes();

    await removeUserFromOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedService.removeUserFromOrganization).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user is not in any organization", async () => {
    mockedService.getOrganizationForUser.mockResolvedValue(null as any);

    const req = {
      params: { userId: "user-1" },
      user: { userId: "owner-A", role: "org_owner" },
    } as any;
    const res = mockRes();

    await removeUserFromOrganizationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedService.removeUserFromOrganization).not.toHaveBeenCalled();
  });

  it("allows an admin to remove a user from any organization", async () => {
    mockedService.getOrganizationForUser.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);

    const req = {
      params: { userId: "user-1" },
      user: { userId: "admin-1", role: "admin" },
    } as any;
    const res = mockRes();

    await removeUserFromOrganizationHandler(req, res);

    expect(mockedService.removeUserFromOrganization).toHaveBeenCalledWith("user-1");
    expect(res.status).not.toHaveBeenCalledWith(403);
  });
});

describe("organizationController.createOrganizationMemberHandler mode (#144 MANAGED_ORG)", () => {
  it("passes the mode through to createOrganizationMember", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);
    mockedService.createOrganizationMember.mockResolvedValue({
      user: { _id: "newUser1", name: "New Member", email: "member@example.com" },
      temporaryPassword: "temp123",
    } as any);

    const req = {
      params: { id: "org-A" },
      user: { userId: "owner-A", role: "org_owner" },
      body: { name: "New Member", email: "member@example.com", mode: "MANAGED_ORG" },
    } as any;
    const res = mockRes();

    await createOrganizationMemberHandler(req, res);

    expect(mockedService.createOrganizationMember).toHaveBeenCalledWith(
      "org-A",
      expect.objectContaining({
        name: "New Member",
        email: "member@example.com",
        mode: "MANAGED_ORG",
      })
    );
  });
});

describe("organizationController provider-key endpoints (#144 MANAGED_ORG)", () => {
  it("addOrganizationProviderKeyHandler adds a key when the org_owner owns the organization", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);
    mockedService.addOrganizationProviderKey.mockResolvedValue({ _id: "key1" } as any);

    const req = {
      params: { id: "org-A" },
      user: { userId: "owner-A", role: "org_owner" },
      body: { provider: "openai", apiKey: "sk-test" },
    } as any;
    const res = mockRes();

    await addOrganizationProviderKeyHandler(req, res);

    expect(mockedService.addOrganizationProviderKey).toHaveBeenCalledWith("org-A", {
      provider: "openai",
      apiKey: "sk-test",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("addOrganizationProviderKeyHandler returns 403 for a cross-org attempt", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);

    const req = {
      params: { id: "org-B" },
      user: { userId: "owner-A", role: "org_owner" },
      body: { provider: "openai", apiKey: "sk-test" },
    } as any;
    const res = mockRes();

    await addOrganizationProviderKeyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedService.addOrganizationProviderKey).not.toHaveBeenCalled();
  });

  it("listOrganizationProviderKeysHandler lists keys for the owning org_owner", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);
    mockedService.listOrganizationProviderKeys.mockResolvedValue([{ _id: "key1" }] as any);

    const req = {
      params: { id: "org-A" },
      user: { userId: "owner-A", role: "org_owner" },
    } as any;
    const res = mockRes();

    await listOrganizationProviderKeysHandler(req, res);

    expect(res.json).toHaveBeenCalledWith([{ _id: "key1" }]);
  });

  it("deleteOrganizationProviderKeyHandler deletes a key when an admin requests it", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-B",
      ownerId: "owner-B",
    } as any);
    mockedService.deleteOrganizationProviderKey.mockResolvedValue({ _id: "key1" } as any);

    const req = {
      params: { id: "org-B", keyId: "key1" },
      user: { userId: "admin-1", role: "admin" },
    } as any;
    const res = mockRes();

    await deleteOrganizationProviderKeyHandler(req, res);

    expect(mockedService.deleteOrganizationProviderKey).toHaveBeenCalledWith("org-B", "key1");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("deleteOrganizationProviderKeyHandler returns 404 when the key does not belong to the organization (#276 IDOR)", async () => {
    mockedService.getOrganizationById.mockResolvedValue({
      _id: "org-A",
      ownerId: "owner-A",
    } as any);
    mockedService.deleteOrganizationProviderKey.mockResolvedValue(null as any);

    const req = {
      params: { id: "org-A", keyId: "key-of-org-B" },
      user: { userId: "owner-A", role: "org_owner" },
    } as any;
    const res = mockRes();

    await deleteOrganizationProviderKeyHandler(req, res);

    expect(mockedService.deleteOrganizationProviderKey).toHaveBeenCalledWith("org-A", "key-of-org-B");
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("organizationController.getPendingOrganizationsHandler (#228 ORG-01)", () => {
  it("returns a newly-created pending organization so an admin can review it", async () => {
    mockedService.getPendingOrganizationsForAdmin.mockResolvedValue([
      { _id: "org1", name: "Acme", status: "pending" },
    ] as any);

    const req = {} as any;
    const res = mockRes();

    await getPendingOrganizationsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [expect.objectContaining({ name: "Acme", status: "pending" })],
      })
    );
  });
});
