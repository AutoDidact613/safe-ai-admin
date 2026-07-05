import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as organizationService from "../organizationService";
import * as repo from "../../repositories/organizationRepository";
import * as userRepo from "../../repositories/userRepository";
import { sendOrgApprovedEmail, sendOrgStatusEmail } from "../../utils/email";

jest.mock("../../repositories/organizationRepository");
jest.mock("../../repositories/userRepository");
jest.mock("../../utils/email");
jest.mock("../authService", () => ({ register: jest.fn() }));
jest.mock("../../models", () => ({
  UsageLog: { aggregate: jest.fn() },
}));

const mockedRepo = jest.mocked(repo);
const mockedUserRepo = jest.mocked(userRepo);

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
