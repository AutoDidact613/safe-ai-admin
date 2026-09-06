import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import {
  runInquiryAgentProcess,
  runInquiryAgentEdit,
  runInquiryAgentApprove,
} from "../inquiryAgentService";

function mockFetchResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
  };
}

describe("inquiryAgentService", () => {
  const originalFetch = global.fetch;
  // Typed as `any`: fetch's real Response type has far more surface than any
  // test double needs, and fighting jest.Mock's generics for it isn't worth it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("runInquiryAgentProcess", () => {
    it("posts thread_id and ids, and returns the parsed drafts", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse(200, { thread_id: "t1", drafts: [{ inquiry_id: "1", text: "draft" }] }),
      );

      const result = await runInquiryAgentProcess("t1", ["1", "2"]);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/run/process"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thread_id: "t1", ids: ["1", "2"] }),
        }),
      );
      expect(result).toEqual({ thread_id: "t1", drafts: [{ inquiry_id: "1", text: "draft" }] });
    });

    it("throws with status 409 when the agent reports a gate mismatch", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse(409, { detail: "This run is not waiting for inquiry selection (gate 1)" }),
      );

      await expect(runInquiryAgentProcess("t1", ["1"])).rejects.toMatchObject({
        message: "This run is not waiting for inquiry selection (gate 1)",
        status: 409,
      });
    });

    it("collapses other agent failures to status 502", async () => {
      fetchMock.mockResolvedValue(mockFetchResponse(500, { detail: "boom" }));

      await expect(runInquiryAgentProcess("t1", ["1"])).rejects.toMatchObject({
        message: "boom",
        status: 502,
      });
    });
  });

  describe("runInquiryAgentEdit", () => {
    it("posts thread_id, inquiry_id and text", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse(200, { thread_id: "t1", inquiry_id: "1", text: "new text" }),
      );

      const result = await runInquiryAgentEdit("t1", "1", "new text");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/run/edit"),
        expect.objectContaining({
          body: JSON.stringify({ thread_id: "t1", inquiry_id: "1", text: "new text" }),
        }),
      );
      expect(result).toEqual({ thread_id: "t1", inquiry_id: "1", text: "new text" });
    });
  });

  describe("runInquiryAgentApprove", () => {
    it("posts thread_id and ids, and returns sent_ids", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse(200, { thread_id: "t1", sent_ids: ["1", "2"] }),
      );

      const result = await runInquiryAgentApprove("t1", ["1", "2"]);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/run/approve"),
        expect.objectContaining({
          body: JSON.stringify({ thread_id: "t1", ids: ["1", "2"] }),
        }),
      );
      expect(result).toEqual({ thread_id: "t1", sent_ids: ["1", "2"] });
    });
  });
});
