import * as repo from "../../repositories/tenderBoardRepository";
import {
  getTenderAgentContext,
  requestTenderSpecification,
  saveTenderSpecification,
  setTenderSpecificationPublished,
} from "../tenderBoardService";

jest.mock("../../repositories/tenderBoardRepository");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../../utils/email", () => ({
  sendApplicantRegisteredEmail: jest.fn(),
  sendTenderClosedEmail: jest.fn(),
}));

describe("tender specification service (SCRUM-287/291/292)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTenderAgentContext", () => {
    it("exposes only the fields the agent needs, not applicants/publisherUserCode", async () => {
      (repo.getTenderById as jest.Mock).mockResolvedValue({
        _id: "123",
        title: "foo",
        shortDescription: "bar",
        productType: "אפליקציה",
        aiApplicationType: "צאטבוט",
        agentsRequired: [],
        timeRequired: { value: 1, unit: "שבועות" },
        budget: 1000,
        additionalDetails: "baz",
        publisherUserCode: "owner-1",
        applicants: [{ name: "should not leak", email: "x@example.com", details: "x" }],
      });

      const context = await getTenderAgentContext("123");

      expect(context).not.toHaveProperty("publisherUserCode");
      expect(context).not.toHaveProperty("applicants");
      expect(context).toMatchObject({ id: "123", title: "foo", productType: "אפליקציה" });
    });

    it("returns null when the tender does not exist", async () => {
      (repo.getTenderById as jest.Mock).mockResolvedValue(null);

      const context = await getTenderAgentContext("missing");

      expect(context).toBeNull();
    });
  });

  describe("requestTenderSpecification", () => {
    it("marks status=pending and clears any previous error", async () => {
      (repo.getTenderById as jest.Mock).mockResolvedValue({
        _id: "123",
        specification: { status: "failed", errorMessage: "old failure" },
      });
      (repo.updateTenderSpecification as jest.Mock).mockResolvedValue({ _id: "123" });

      await requestTenderSpecification("123");

      expect(repo.updateTenderSpecification).toHaveBeenCalledWith(
        "123",
        expect.objectContaining({ status: "pending", errorMessage: undefined })
      );
    });

    it("throws when the tender does not exist", async () => {
      (repo.getTenderById as jest.Mock).mockResolvedValue(null);

      await expect(requestTenderSpecification("missing")).rejects.toThrow("Tender not found");
      expect(repo.updateTenderSpecification).not.toHaveBeenCalled();
    });
  });

  describe("saveTenderSpecification", () => {
    beforeEach(() => {
      (repo.getTenderById as jest.Mock).mockResolvedValue({ _id: "123" });
      (repo.updateTenderSpecification as jest.Mock).mockResolvedValue({ _id: "123" });
    });

    it("caps openSourceReferences and readingSources at 5 each", async () => {
      const makeRefs = (count: number) =>
        Array.from({ length: count }, (_, i) => ({ title: `foo-${i}`, url: `https://example.com/${i}` }));

      await saveTenderSpecification("123", {
        status: "ready",
        openSourceReferences: makeRefs(8),
        readingSources: makeRefs(7),
      });

      const savedSpec = (repo.updateTenderSpecification as jest.Mock).mock.calls[0][1];
      expect(savedSpec.openSourceReferences).toHaveLength(5);
      expect(savedSpec.readingSources).toHaveLength(5);
    });

    it("rejects an invalid status without touching the repository", async () => {
      await expect(
        saveTenderSpecification("123", { status: "not-a-real-status" } as any)
      ).rejects.toThrow("Invalid specification status");

      expect(repo.updateTenderSpecification).not.toHaveBeenCalled();
    });

    it("re-running on the same tender overwrites the previous specification instead of appending", async () => {
      await saveTenderSpecification("123", { status: "ready", document: "first run" });
      await saveTenderSpecification("123", { status: "ready", document: "second run" });

      expect(repo.updateTenderSpecification).toHaveBeenCalledTimes(2);
      const secondCallSpec = (repo.updateTenderSpecification as jest.Mock).mock.calls[1][1];
      expect(secondCallSpec.document).toBe("second run");
    });

    it("always resets isPublished to false on a new run, even if it was previously published", async () => {
      await saveTenderSpecification("123", { status: "ready", document: "new run" });

      const savedSpec = (repo.updateTenderSpecification as jest.Mock).mock.calls[0][1];
      expect(savedSpec.isPublished).toBe(false);
    });

    it("throws when the tender does not exist", async () => {
      (repo.getTenderById as jest.Mock).mockResolvedValue(null);

      await expect(saveTenderSpecification("missing", { status: "ready" })).rejects.toThrow("Tender not found");
    });
  });

  describe("setTenderSpecificationPublished", () => {
    it("toggles isPublished while preserving the rest of the specification", async () => {
      (repo.getTenderById as jest.Mock).mockResolvedValue({
        _id: "123",
        specification: { status: "ready", document: "foo", isPublished: false },
      });
      (repo.updateTenderSpecification as jest.Mock).mockResolvedValue({ _id: "123" });

      await setTenderSpecificationPublished("123", true);

      expect(repo.updateTenderSpecification).toHaveBeenCalledWith(
        "123",
        expect.objectContaining({ document: "foo", isPublished: true })
      );
    });

    it("throws when the tender has no specification yet", async () => {
      (repo.getTenderById as jest.Mock).mockResolvedValue({ _id: "123", specification: undefined });

      await expect(setTenderSpecificationPublished("123", true)).rejects.toThrow(
        "Tender specification not found"
      );
    });
  });
});
