import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as organizationService from "../organizationService";
import * as repo from "../../repositories/organizationRepository";
import * as userRepo from "../../repositories/userRepository";
import {
  sendOrgApprovedEmail,
  sendOrgStatusEmail,
  sendOrgApprovalRequestEmail,
} from "../../utils/email";
import { register } from "../authService";
import { UsageLog } from "../../models";

jest.mock("../../repositories/organizationRepository");
jest.mock("../../repositories/userRepository");
jest.mock("../../utils/email");
jest.mock("../authService", () => ({ register: jest.fn() }));
jest.mock("../../models", () => ({
  UsageLog: { aggregate: jest.fn() },
}));

const mockedRepo = jest.mocked(repo);
const mockedUserRepo = jest.mocked(userRepo);
const mockedRegister = jest.mocked(register);
const mockedUsageLog = jest.mocked(UsageLog);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("organizationService.addUserToOrganization", () => {
  it("throws if the organization does not exist", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue(null as any);

    await expect(
      organizationService.addUserToOrganization("org1", "user1")
    ).rejects.toThrow("Organization not found");
  });

  it("throws if the user does not exist", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({ _id: "org1" } as any);
    mockedUserRepo.getUserById.mockResolvedValue(null as any);

    await expect(
      organizationService.addUserToOrganization("org1", "user1")
    ).rejects.toThrow("User not found");
  });

  it("throws when the organization already has maxUsers members", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      settings: { maxUsers: 3 },
    } as any);
    mockedUserRepo.getUserById.mockResolvedValue({ _id: "user1" } as any);
    mockedUserRepo.countUsersByOrganization.mockResolvedValue(3);

    await expect(
      organizationService.addUserToOrganization("org1", "user1")
    ).rejects.toThrow("הארגון הגיע למספר המשתמשים המרבי המותר (3)");

    expect(mockedUserRepo.updateUser).not.toHaveBeenCalled();
  });

  it("allows adding a user already in the org even at the maxUsers limit", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      settings: { maxUsers: 1 },
    } as any);
    mockedUserRepo.getUserById.mockResolvedValue({
      _id: "user1",
      organizationId: "org1",
    } as any);
    mockedUserRepo.countUsersByOrganization.mockResolvedValue(1);

    await organizationService.addUserToOrganization("org1", "user1", "user");

    expect(mockedUserRepo.updateUser).toHaveBeenCalledWith("user1", {
      organizationId: "org1",
      role: "user",
    });
  });

  it("defaults maxUsers to 10 when settings are missing", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({ _id: "org1" } as any);
    mockedUserRepo.getUserById.mockResolvedValue({ _id: "user1" } as any);
    mockedUserRepo.countUsersByOrganization.mockResolvedValue(10);

    await expect(
      organizationService.addUserToOrganization("org1", "user1")
    ).rejects.toThrow("(10)");
  });
});

describe("organizationService.removeUserFromOrganization", () => {
  it("throws if the user does not exist", async () => {
    mockedUserRepo.getUserById.mockResolvedValue(null as any);

    await expect(
      organizationService.removeUserFromOrganization("user1")
    ).rejects.toThrow("User not found");
  });

  it("clears the user's organizationId", async () => {
    mockedUserRepo.getUserById.mockResolvedValue({ _id: "user1" } as any);
    mockedUserRepo.updateUser.mockResolvedValue({ _id: "user1" } as any);

    await organizationService.removeUserFromOrganization("user1");

    expect(mockedUserRepo.updateUser).toHaveBeenCalledWith("user1", {
      organizationId: null,
    });
  });
});

describe("organizationService.approveOrganization", () => {
  it("throws if the organization does not exist", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue(null as any);

    await expect(
      organizationService.approveOrganization("org1")
    ).rejects.toThrow("Organization not found");
  });

  it("throws if the organization is not pending", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      status: "approved",
    } as any);

    await expect(
      organizationService.approveOrganization("org1")
    ).rejects.toThrow("ניתן לאשר רק ארגון שממתין לאישור");
  });

  it("approves a pending organization and notifies the owner", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      status: "pending",
      name: "Acme",
      ownerId: { email: "owner@example.com", name: "Owner" },
    } as any);
    mockedRepo.updateOrganization.mockResolvedValue({
      _id: "org1",
      status: "approved",
      isActive: true,
    } as any);

    const result = await organizationService.approveOrganization("org1");

    expect(mockedRepo.updateOrganization).toHaveBeenCalledWith("org1", {
      status: "approved",
      isActive: true,
    });
    expect(sendOrgApprovedEmail).toHaveBeenCalledWith(
      "owner@example.com",
      "Acme",
      "Owner"
    );
    expect(result).toEqual({ _id: "org1", status: "approved", isActive: true });
  });
});

describe("organizationService.rejectOrganization", () => {
  it("throws if the organization is not pending", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      status: "rejected",
    } as any);

    await expect(
      organizationService.rejectOrganization("org1")
    ).rejects.toThrow("ניתן לדחות רק ארגון שממתין לאישור");
  });

  it("rejects a pending organization and notifies the owner", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      status: "pending",
      name: "Acme",
      ownerId: { email: "owner@example.com", name: "Owner" },
    } as any);
    mockedRepo.updateOrganization.mockResolvedValue({
      _id: "org1",
      status: "rejected",
      isActive: false,
    } as any);

    await organizationService.rejectOrganization("org1");

    expect(mockedRepo.updateOrganization).toHaveBeenCalledWith("org1", {
      status: "rejected",
      isActive: false,
    });
    expect(sendOrgStatusEmail).toHaveBeenCalledWith(
      "rejected",
      "owner@example.com",
      "Acme",
      "Owner"
    );
  });
});

describe("organizationService.setOrganizationActive", () => {
  it("throws if the organization does not exist", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue(null as any);

    await expect(
      organizationService.setOrganizationActive("org1", false)
    ).rejects.toThrow("Organization not found");
  });

  it("throws if the organization is not approved", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      status: "pending",
      isActive: false,
    } as any);

    await expect(
      organizationService.setOrganizationActive("org1", true)
    ).rejects.toThrow("ניתן להשעות או להפעיל מחדש רק ארגון מאושר");
  });

  it("throws if the organization is already in the requested state", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      status: "approved",
      isActive: true,
    } as any);

    await expect(
      organizationService.setOrganizationActive("org1", true)
    ).rejects.toThrow("הארגון כבר פעיל");
  });

  it("suspends an active approved organization", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      status: "approved",
      isActive: true,
      name: "Acme",
      ownerId: { email: "owner@example.com", name: "Owner" },
    } as any);
    mockedRepo.updateOrganization.mockResolvedValue({
      _id: "org1",
      isActive: false,
    } as any);

    await organizationService.setOrganizationActive("org1", false);

    expect(mockedRepo.updateOrganization).toHaveBeenCalledWith("org1", {
      isActive: false,
    });
  });
});

describe("organizationService.createOrganization", () => {
  it("throws if the owner user does not exist", async () => {
    mockedUserRepo.getUserById.mockResolvedValue(null as any);

    await expect(
      organizationService.createOrganization({ ownerId: "owner1", name: "Acme" })
    ).rejects.toThrow("Owner user not found");

    expect(mockedRepo.createOrganization).not.toHaveBeenCalled();
  });

  it("promotes a regular owner to org_owner and links the organization", async () => {
    mockedUserRepo.getUserById.mockResolvedValue({ _id: "owner1", role: "user" } as any);
    mockedRepo.createOrganization.mockResolvedValue({ _id: "org1" } as any);

    await organizationService.createOrganization({ ownerId: "owner1", name: "Acme" });

    expect(mockedUserRepo.updateUser).toHaveBeenCalledWith("owner1", {
      role: "org_owner",
      organizationId: "org1",
    });
  });

  it("keeps an admin owner's role as admin", async () => {
    mockedUserRepo.getUserById.mockResolvedValue({ _id: "owner1", role: "admin" } as any);
    mockedRepo.createOrganization.mockResolvedValue({ _id: "org1" } as any);

    await organizationService.createOrganization({ ownerId: "owner1", name: "Acme" });

    expect(mockedUserRepo.updateUser).toHaveBeenCalledWith("owner1", {
      role: "admin",
      organizationId: "org1",
    });
  });
});

describe("organizationService.deleteOrganization", () => {
  it("bulk-clears organizationId from all members before deleting the org", async () => {
    mockedUserRepo.removeUsersFromOrganization.mockResolvedValue(undefined as any);
    mockedRepo.deleteOrganization.mockResolvedValue({} as any);

    await organizationService.deleteOrganization("org1");

    expect(mockedUserRepo.removeUsersFromOrganization).toHaveBeenCalledWith("org1");
    expect(mockedRepo.deleteOrganization).toHaveBeenCalledWith("org1");
  });
});

describe("organizationService.addUserToOrganizationByEmail", () => {
  it("throws if no user matches the email", async () => {
    mockedUserRepo.findUserByEmail.mockResolvedValue(null as any);

    await expect(
      organizationService.addUserToOrganizationByEmail("org1", "Nobody@Example.com")
    ).rejects.toThrow("User not found");

    expect(mockedUserRepo.findUserByEmail).toHaveBeenCalledWith("nobody@example.com");
  });

  it("delegates to addUserToOrganization with the resolved user id", async () => {
    mockedUserRepo.findUserByEmail.mockResolvedValue({ _id: "user1" } as any);
    mockedRepo.getOrganizationById.mockResolvedValue({ _id: "org1" } as any);
    mockedUserRepo.getUserById.mockResolvedValue({ _id: "user1" } as any);
    mockedUserRepo.countUsersByOrganization.mockResolvedValue(0);

    await organizationService.addUserToOrganizationByEmail("org1", "user@example.com", "admin");

    expect(mockedUserRepo.updateUser).toHaveBeenCalledWith("user1", {
      organizationId: "org1",
      role: "admin",
    });
  });
});

describe("organizationService.createOrganizationMember", () => {
  const memberData = { name: "New Member", email: "member@example.com" };

  it("throws if the organization does not exist", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue(null as any);

    await expect(
      organizationService.createOrganizationMember("org1", memberData)
    ).rejects.toThrow("Organization not found");

    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it("throws when the organization already has maxUsers members", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      settings: { maxUsers: 2 },
    } as any);
    mockedUserRepo.countUsersByOrganization.mockResolvedValue(2);

    await expect(
      organizationService.createOrganizationMember("org1", memberData)
    ).rejects.toThrow("הארגון הגיע למספר המשתמשים המרבי המותר (2)");

    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it("registers a new user linked to the organization with a generated password", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({ _id: "org1" } as any);
    mockedUserRepo.countUsersByOrganization.mockResolvedValue(0);
    mockedRegister.mockResolvedValue({
      user: { _id: "newUser1", name: "New Member", email: "member@example.com" },
    } as any);

    const result = await organizationService.createOrganizationMember("org1", memberData);

    expect(mockedRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "member@example.com",
        name: "New Member",
        organizationId: "org1",
        role: "user",
        skipEmailVerification: true,
      })
    );
    expect(result.user).toEqual({
      _id: "newUser1",
      name: "New Member",
      email: "member@example.com",
    });
    expect(typeof result.temporaryPassword).toBe("string");
    expect(result.temporaryPassword.length).toBeGreaterThan(0);
  });

  it("uses the given role instead of the default", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({ _id: "org1" } as any);
    mockedUserRepo.countUsersByOrganization.mockResolvedValue(0);
    mockedRegister.mockResolvedValue({ user: { _id: "newUser1" } } as any);

    await organizationService.createOrganizationMember("org1", { ...memberData, role: "admin" });

    expect(mockedRegister).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin" })
    );
  });
});

describe("organizationService.topUpOrganizationWallet", () => {
  it("throws if the organization does not exist", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue(null as any);

    await expect(
      organizationService.topUpOrganizationWallet("org1", 50)
    ).rejects.toThrow("Organization not found");
  });

  it("adds the amount to the current wallet balance", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({
      _id: "org1",
      walletBalance: 100,
    } as any);
    mockedRepo.updateOrganization.mockResolvedValue({} as any);

    await organizationService.topUpOrganizationWallet("org1", 50);

    expect(mockedRepo.updateOrganization).toHaveBeenCalledWith("org1", {
      walletBalance: 150,
    });
  });

  it("treats a missing wallet balance as zero", async () => {
    mockedRepo.getOrganizationById.mockResolvedValue({ _id: "org1" } as any);
    mockedRepo.updateOrganization.mockResolvedValue({} as any);

    await organizationService.topUpOrganizationWallet("org1", 50);

    expect(mockedRepo.updateOrganization).toHaveBeenCalledWith("org1", {
      walletBalance: 50,
    });
  });
});

describe("organizationService.publicRequestOrganization", () => {
  const input = {
    ownerName: "Owner",
    ownerEmail: "owner@example.com",
    ownerPassword: "secret123",
    orgName: "Acme",
  };

  it("throws if the organization name is already taken", async () => {
    mockedRepo.findOrganizationByName.mockResolvedValue({ _id: "existing" } as any);

    await expect(
      organizationService.publicRequestOrganization(input)
    ).rejects.toThrow("שם הארגון כבר תפוס");

    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it("throws if the owner email format is invalid", async () => {
    await expect(
      organizationService.publicRequestOrganization({
        ...input,
        ownerEmail: "not-an-email",
      })
    ).rejects.toThrow("כתובת האימייל אינה תקינה");

    expect(mockedRepo.findOrganizationByName).not.toHaveBeenCalled();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it("rolls back the created user if organization creation fails on a duplicate name", async () => {
    mockedRepo.findOrganizationByName.mockResolvedValue(null as any);
    mockedRegister.mockResolvedValue({ user: { _id: "user1" } } as any);
    mockedRepo.createOrganization.mockRejectedValue({ code: 11000 });

    await expect(
      organizationService.publicRequestOrganization(input)
    ).rejects.toThrow("שם הארגון כבר תפוס");

    expect(mockedUserRepo.deleteUser).toHaveBeenCalledWith("user1");
  });

  it("creates a pending organization and links it to the new owner", async () => {
    mockedRepo.findOrganizationByName.mockResolvedValue(null as any);
    mockedRegister.mockResolvedValue({ user: { _id: "user1" } } as any);
    mockedRepo.createOrganization.mockResolvedValue({ _id: "org1" } as any);
    mockedUserRepo.getUsers.mockResolvedValue([]);

    const result = await organizationService.publicRequestOrganization(input);

    expect(mockedRepo.createOrganization).toHaveBeenCalledWith({
      name: "Acme",
      description: "",
      ownerId: "user1",
      status: "pending",
      isActive: false,
    });
    expect(mockedUserRepo.updateUser).toHaveBeenCalledWith("user1", {
      organizationId: "org1",
    });
    expect(result).toEqual({ _id: "org1" });
  });

  it("notifies all admins about the new request", async () => {
    mockedRepo.findOrganizationByName.mockResolvedValue(null as any);
    mockedRegister.mockResolvedValue({ user: { _id: "user1" } } as any);
    mockedRepo.createOrganization.mockResolvedValue({ _id: "org1" } as any);
    mockedUserRepo.getUsers.mockResolvedValue([
      { _id: "a1", role: "admin", email: "admin1@example.com" },
      { _id: "a2", role: "admin", email: "admin2@example.com" },
      { _id: "u1", role: "user", email: "user@example.com" },
    ] as any);

    await organizationService.publicRequestOrganization(input);

    expect(sendOrgApprovalRequestEmail).toHaveBeenCalledTimes(2);
    expect(sendOrgApprovalRequestEmail).toHaveBeenCalledWith(
      "admin1@example.com",
      "Acme",
      "owner@example.com"
    );
  });
});

describe("organizationService.getMyOrganization", () => {
  it("returns null if the user has no organization", async () => {
    mockedUserRepo.getUserById.mockResolvedValue({ _id: "user1" } as any);

    const result = await organizationService.getMyOrganization("user1");

    expect(result).toBeNull();
    expect(mockedRepo.getOrganizationById).not.toHaveBeenCalled();
  });

  it("returns null if the user does not exist", async () => {
    mockedUserRepo.getUserById.mockResolvedValue(null as any);

    const result = await organizationService.getMyOrganization("user1");

    expect(result).toBeNull();
  });

  it("fetches the organization the user belongs to", async () => {
    mockedUserRepo.getUserById.mockResolvedValue({
      _id: "user1",
      organizationId: "org1",
    } as any);
    mockedRepo.getOrganizationById.mockResolvedValue({ _id: "org1" } as any);

    const result = await organizationService.getMyOrganization("user1");

    expect(mockedRepo.getOrganizationById).toHaveBeenCalledWith("org1");
    expect(result).toEqual({ _id: "org1" });
  });
});

describe("organizationService.getOrganizationUsageSummary", () => {
  it("aggregates usage across all organization members", async () => {
    mockedUserRepo.getUsersByOrganization.mockResolvedValue([
      { _id: "u1", organizationId: "org1" },
      { _id: "u2", organizationId: "org1" },
    ] as any);
    mockedUsageLog.aggregate.mockResolvedValue([
      { totalRequests: 5, totalTokens: 1000, totalCost: 2.5 },
    ] as any);

    const result = await organizationService.getOrganizationUsageSummary("org1");

    expect(mockedUsageLog.aggregate).toHaveBeenCalledWith([
      { $match: { userId: { $in: ["u1", "u2"] }, success: true } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$cost" },
        },
      },
    ]);
    expect(result).toEqual({
      userCount: 2,
      totalRequests: 5,
      totalTokens: 1000,
      totalCost: 2.5,
    });
  });

  it("defaults to zeroed stats when there is no usage yet", async () => {
    mockedUserRepo.getUsersByOrganization.mockResolvedValue([
      { _id: "u1", organizationId: "org1" },
    ] as any);
    mockedUsageLog.aggregate.mockResolvedValue([] as any);

    const result = await organizationService.getOrganizationUsageSummary("org1");

    expect(result).toEqual({
      userCount: 1,
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
    });
  });
});

describe("organizationService.updateOrganization", () => {
  it("delegates to the repository with the given data", async () => {
    mockedRepo.updateOrganization.mockResolvedValue({ _id: "org1", name: "New" } as any);

    const result = await organizationService.updateOrganization("org1", { name: "New" });

    expect(mockedRepo.updateOrganization).toHaveBeenCalledWith("org1", { name: "New" });
    expect(result).toEqual({ _id: "org1", name: "New" });
  });
});

describe("organizationService.getOrganizationUsers", () => {
  it("delegates to a targeted repository query for the given organization", async () => {
    mockedUserRepo.getUsersByOrganization.mockResolvedValue([
      { _id: "u1", organizationId: "org1" },
      { _id: "u3", organizationId: "org1" },
    ] as any);

    const result = await organizationService.getOrganizationUsers("org1");

    expect(mockedUserRepo.getUsersByOrganization).toHaveBeenCalledWith("org1");
    expect(result).toEqual([
      { _id: "u1", organizationId: "org1" },
      { _id: "u3", organizationId: "org1" },
    ]);
  });
});

describe("organizationService.getOrganizationForUser", () => {
  it("returns null if the user does not exist", async () => {
    mockedUserRepo.getUserById.mockResolvedValue(null as any);

    const result = await organizationService.getOrganizationForUser("user1");

    expect(result).toBeNull();
    expect(mockedRepo.getOrganizationById).not.toHaveBeenCalled();
  });

  it("returns null if the user has no organization", async () => {
    mockedUserRepo.getUserById.mockResolvedValue({ _id: "user1" } as any);

    const result = await organizationService.getOrganizationForUser("user1");

    expect(result).toBeNull();
  });

  it("returns the organization the user belongs to", async () => {
    mockedUserRepo.getUserById.mockResolvedValue({
      _id: "user1",
      organizationId: "org1",
    } as any);
    mockedRepo.getOrganizationById.mockResolvedValue({ _id: "org1" } as any);

    const result = await organizationService.getOrganizationForUser("user1");

    expect(mockedRepo.getOrganizationById).toHaveBeenCalledWith("org1");
    expect(result).toEqual({ _id: "org1" });
  });
});
