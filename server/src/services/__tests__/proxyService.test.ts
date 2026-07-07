import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { resolveProviderKeyForUser } from "../proxyService";
import * as providerKeyRepository from "../../repositories/providerKeyRepository";
import * as organizationService from "../organizationService";

jest.mock("../../repositories/providerKeyRepository", () => ({
  getProviderKeyByUserAndProvider: jest.fn(),
  getSystemProviderKey: jest.fn(),
  getProviderKeyByOrgAndProvider: jest.fn(),
}));
jest.mock("../organizationService", () => ({
  getOrganizationForUser: jest.fn(),
}));
jest.mock("../../utils/crypto", () => ({
  decryptSecret: jest.fn(),
  encryptSecret: jest.fn(),
  getKeyPrefix: jest.fn(),
}));
jest.mock("../../workflows/proxyFilter", () => ({
  guardInput: jest.fn(),
}));

const mockedRepo = jest.mocked(providerKeyRepository);
const mockedOrgService = jest.mocked(organizationService);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("proxyService.resolveProviderKeyForUser (#144 MANAGED_ORG)", () => {
  it("uses the user's own key for BYOK", async () => {
    mockedRepo.getProviderKeyByUserAndProvider.mockResolvedValue({ _id: "key1" } as any);

    const result = await resolveProviderKeyForUser(
      { _id: "user1", mode: "BYOK" },
      "openai"
    );

    expect(mockedRepo.getProviderKeyByUserAndProvider).toHaveBeenCalledWith("user1", "openai");
    expect(result).toEqual({ _id: "key1" });
  });

  it("uses the system key for MANAGED", async () => {
    mockedRepo.getSystemProviderKey.mockResolvedValue({ _id: "sys-key" } as any);

    const result = await resolveProviderKeyForUser(
      { _id: "user1", mode: "MANAGED" },
      "openai"
    );

    expect(mockedRepo.getSystemProviderKey).toHaveBeenCalledWith("openai");
    expect(result).toEqual({ _id: "sys-key" });
  });

  it("uses the organization's key for MANAGED_ORG", async () => {
    mockedOrgService.getOrganizationForUser.mockResolvedValue({
      _id: "org1",
      settings: {},
    } as any);
    mockedRepo.getProviderKeyByOrgAndProvider.mockResolvedValue({ _id: "org-key" } as any);

    const result = await resolveProviderKeyForUser(
      { _id: "user1", mode: "MANAGED_ORG" },
      "openai",
      "gpt-4o-mini"
    );

    expect(mockedOrgService.getOrganizationForUser).toHaveBeenCalledWith("user1");
    expect(mockedRepo.getProviderKeyByOrgAndProvider).toHaveBeenCalledWith("org1", "openai");
    expect(result).toEqual({ _id: "org-key" });
  });

  it("throws when a MANAGED_ORG user has no organization", async () => {
    mockedOrgService.getOrganizationForUser.mockResolvedValue(null);

    await expect(
      resolveProviderKeyForUser({ _id: "user1", mode: "MANAGED_ORG" }, "openai")
    ).rejects.toThrow("User is not linked to an organization");

    expect(mockedRepo.getProviderKeyByOrgAndProvider).not.toHaveBeenCalled();
  });

  it("throws when the requested model is not in the organization's allowedModels", async () => {
    mockedOrgService.getOrganizationForUser.mockResolvedValue({
      _id: "org1",
      settings: { allowedModels: ["gpt-4o-mini"] },
    } as any);

    await expect(
      resolveProviderKeyForUser(
        { _id: "user1", mode: "MANAGED_ORG" },
        "openai",
        "gpt-4o"
      )
    ).rejects.toThrow("Model not allowed for your organization: gpt-4o");

    expect(mockedRepo.getProviderKeyByOrgAndProvider).not.toHaveBeenCalled();
  });

  it("allows any model for MANAGED_ORG when allowedModels is empty (no restriction)", async () => {
    mockedOrgService.getOrganizationForUser.mockResolvedValue({
      _id: "org1",
      settings: { allowedModels: [] },
    } as any);
    mockedRepo.getProviderKeyByOrgAndProvider.mockResolvedValue({ _id: "org-key" } as any);

    const result = await resolveProviderKeyForUser(
      { _id: "user1", mode: "MANAGED_ORG" },
      "openai",
      "gpt-4o"
    );

    expect(result).toEqual({ _id: "org-key" });
  });
});
