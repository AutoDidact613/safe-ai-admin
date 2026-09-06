import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import router from "../../routes/inquiryAgentRouter";
import * as service from "../../services/inquiryAgentService";

jest.mock("../../services/inquiryAgentService");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use("/inquiry-agent", router);

const mockedService = jest.mocked(service);

describe("inquiryAgentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /inquiry-agent/run/process", () => {
    it("returns 200 with the drafts on success", async () => {
      mockedService.runInquiryAgentProcess.mockResolvedValue({
        thread_id: "t1",
        drafts: [{ inquiry_id: "1", text: "draft" }],
      });

      const res = await request(app)
        .post("/inquiry-agent/run/process")
        .send({ threadId: "t1", ids: ["1"] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ thread_id: "t1", drafts: [{ inquiry_id: "1", text: "draft" }] });
      expect(mockedService.runInquiryAgentProcess).toHaveBeenCalledWith("t1", ["1"]);
    });

    it("returns 400 and never calls the service when ids is missing", async () => {
      const res = await request(app)
        .post("/inquiry-agent/run/process")
        .send({ threadId: "t1" });

      expect(res.status).toBe(400);
      expect(mockedService.runInquiryAgentProcess).not.toHaveBeenCalled();
    });

    it("returns 409 when the agent reports a gate mismatch", async () => {
      mockedService.runInquiryAgentProcess.mockRejectedValue(
        Object.assign(new Error("not at gate 1"), { status: 409 }),
      );

      const res = await request(app)
        .post("/inquiry-agent/run/process")
        .send({ threadId: "t1", ids: ["1"] });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("not at gate 1");
    });
  });

  describe("POST /inquiry-agent/run/edit", () => {
    it("returns 200 with the updated draft", async () => {
      mockedService.runInquiryAgentEdit.mockResolvedValue({
        inquiry_id: "1",
        text: "new text",
      });

      const res = await request(app)
        .post("/inquiry-agent/run/edit")
        .send({ threadId: "t1", inquiryId: "1", text: "new text" });

      expect(res.status).toBe(200);
      expect(mockedService.runInquiryAgentEdit).toHaveBeenCalledWith("t1", "1", "new text");
    });

    it("returns 400 and never calls the service when text is empty", async () => {
      const res = await request(app)
        .post("/inquiry-agent/run/edit")
        .send({ threadId: "t1", inquiryId: "1", text: "" });

      expect(res.status).toBe(400);
      expect(mockedService.runInquiryAgentEdit).not.toHaveBeenCalled();
    });
  });

  describe("POST /inquiry-agent/run/approve", () => {
    it("returns 200 with sent_ids", async () => {
      mockedService.runInquiryAgentApprove.mockResolvedValue({ sent_ids: ["1", "2"] });

      const res = await request(app)
        .post("/inquiry-agent/run/approve")
        .send({ threadId: "t1", ids: ["1", "2"] });

      expect(res.status).toBe(200);
      expect(mockedService.runInquiryAgentApprove).toHaveBeenCalledWith("t1", ["1", "2"]);
    });

    it("returns 504 when the agent call times out", async () => {
      const timeoutError = Object.assign(new Error("timed out"), { name: "TimeoutError" });
      mockedService.runInquiryAgentApprove.mockRejectedValue(timeoutError);

      const res = await request(app)
        .post("/inquiry-agent/run/approve")
        .send({ threadId: "t1", ids: ["1"] });

      expect(res.status).toBe(504);
    });

    it("returns 400 and never calls the service when ids is an empty array", async () => {
      const res = await request(app)
        .post("/inquiry-agent/run/approve")
        .send({ threadId: "t1", ids: [] });

      expect(res.status).toBe(400);
      expect(mockedService.runInquiryAgentApprove).not.toHaveBeenCalled();
    });
  });
});
