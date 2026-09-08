import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as repo from "../organizationRepository";
import { Organization } from "../../models/organization";

jest.mock("../../models/organization", () => ({
  Organization: {
    find: jest.fn(),
  },
}));

const mockedOrganization = jest.mocked(Organization);

function mockQuery(result: unknown) {
  const query = {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn<() => Promise<unknown>>().mockResolvedValue(result),
  };
  return query;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// #281: the previous test for this feature only asserted that whatever the
// (mocked) service returned was passed through the controller response - it
// never verified that the query itself excludes non-pending organizations.
describe("organizationRepository.getPendingOrganizations", () => {
  it("queries only organizations with status 'pending'", async () => {
    const query = mockQuery([{ _id: "org1", name: "Acme", status: "pending" }]);
    mockedOrganization.find.mockReturnValue(query as any);

    await repo.getPendingOrganizations();

    expect(mockedOrganization.find).toHaveBeenCalledWith({ status: "pending" });
    expect(mockedOrganization.find).not.toHaveBeenCalledWith({});
    expect(mockedOrganization.find).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" })
    );
  });

  it("does not include approved or rejected organizations in the result", async () => {
    // Guards against a future regression where the filter is loosened/removed
    // and approved/rejected orgs leak into the admin's pending queue.
    const query = mockQuery([{ _id: "org1", name: "Acme", status: "pending" }]);
    mockedOrganization.find.mockReturnValue(query as any);

    const result = await repo.getPendingOrganizations();

    expect(result.every((org: any) => org.status === "pending")).toBe(true);
  });
});
