import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import { submitContactForm, registerAttachment } from "../contactController";
import * as contactMessageService from "../../services/contactMessageService";
import * as attachmentService from "../../services/attachmentService";
import { sendContactEmail } from "../../utils/email";

jest.mock("../../services/contactMessageService");
jest.mock("../../services/attachmentService");
jest.mock("../../utils/email");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockedService = jest.mocked(contactMessageService);
const mockedAttachmentService = jest.mocked(attachmentService);
const mockedSendContactEmail = jest.mocked(sendContactEmail);

type SavedMessage = Awaited<ReturnType<typeof contactMessageService.saveMessage>>;

const app = express();
// Matches the production body-size limit (index.ts) so the oversized-payload
// test below exercises this controller's own size check, not express's
// default 100kb body-parser cutoff.
app.use(express.json({ limit: "50mb" }));
// Stand-in for authenticateToken: the controllers only read req.user, so
// tests inject it directly instead of exercising real JWT verification.
// (Cast bypasses the global Express.Request.user augmentation, which types
// it more narrowly than what the controllers actually read off it.)
app.use((req, _res, next) => {
  (req as unknown as { user: Record<string, unknown> }).user = {
    userId: "user1",
    id: "user1",
    email: "user@example.com",
    name: "Test User",
  };
  next();
});
app.post("/contact", submitContactForm);
app.post("/contact/attachments", registerAttachment);

describe("contactController.submitContactForm", () => {
  const validBody = { title: "Bug report", description: "Something broke", requestType: "bug" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSendContactEmail.mockResolvedValue(undefined);
  });

  it("saves the message and returns 200 on the happy path (no attachments)", async () => {
    mockedService.saveMessage.mockResolvedValue({} as SavedMessage);

    const res = await request(app).post("/contact").send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockedService.saveMessage).toHaveBeenCalledWith(
      { title: "Bug report", description: "Something broke", requestType: "bug" },
      "user1",
    );
    expect(mockedAttachmentService.linkAttachmentsToMessage).not.toHaveBeenCalled();
  });

  it("saves attachments and links them to the saved message when provided and valid", async () => {
    mockedService.saveMessage.mockResolvedValue({ id: "msg1" } as SavedMessage);
    const attachments = [
      { url: "https://bucket.s3.amazonaws.com/a.png", type: "image" },
      { url: "https://bucket.s3.amazonaws.com/b.webm", type: "video" },
    ];

    const res = await request(app).post("/contact").send({ ...validBody, attachments });

    expect(res.status).toBe(200);
    expect(mockedService.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ attachments }),
      "user1",
    );
    expect(mockedAttachmentService.linkAttachmentsToMessage).toHaveBeenCalledWith(
      ["https://bucket.s3.amazonaws.com/a.png", "https://bucket.s3.amazonaws.com/b.webm"],
      "user1",
      "msg1",
    );
  });

  it("still returns 200 if linking attachments to the message fails (best-effort)", async () => {
    mockedService.saveMessage.mockResolvedValue({ id: "msg1" } as SavedMessage);
    mockedAttachmentService.linkAttachmentsToMessage.mockRejectedValue(new Error("db down"));
    const attachments = [{ url: "https://bucket.s3.amazonaws.com/a.png", type: "image" }];

    const res = await request(app).post("/contact").send({ ...validBody, attachments });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects more than 5 attachments without calling the service", async () => {
    const attachments = Array.from({ length: 6 }, (_, i) => ({
      url: `https://bucket.s3.amazonaws.com/${i}.png`,
      type: "image",
    }));

    const res = await request(app).post("/contact").send({ ...validBody, attachments });

    expect(res.status).toBe(400);
    expect(mockedService.saveMessage).not.toHaveBeenCalled();
  });

  it("rejects an attachment with an unsupported type", async () => {
    const attachments = [{ url: "https://bucket.s3.amazonaws.com/a.pdf", type: "pdf" }];

    const res = await request(app).post("/contact").send({ ...validBody, attachments });

    expect(res.status).toBe(400);
    expect(mockedService.saveMessage).not.toHaveBeenCalled();
  });

  it("rejects an attachment missing a url", async () => {
    const attachments = [{ type: "image" }];

    const res = await request(app).post("/contact").send({ ...validBody, attachments });

    expect(res.status).toBe(400);
    expect(mockedService.saveMessage).not.toHaveBeenCalled();
  });

  it("rejects when attachments is not an array", async () => {
    const res = await request(app)
      .post("/contact")
      .send({ ...validBody, attachments: "not-an-array" });

    expect(res.status).toBe(400);
    expect(mockedService.saveMessage).not.toHaveBeenCalled();
  });

  it("returns 400 and never calls the service when required fields are missing", async () => {
    const res = await request(app)
      .post("/contact")
      .send({ title: "", description: "", requestType: "" });

    expect(res.status).toBe(400);
    expect(mockedService.saveMessage).not.toHaveBeenCalled();
  });

  it("returns 500 when saving fails", async () => {
    mockedService.saveMessage.mockRejectedValue(new Error("db down"));

    const res = await request(app).post("/contact").send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("contactController.registerAttachment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a valid attachment as pending and returns 201", async () => {
    const created = { id: "att1", url: "https://bucket.s3.amazonaws.com/a.png", type: "image" };
    mockedAttachmentService.registerPendingAttachment.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/contact/attachments")
      .send({ url: "https://bucket.s3.amazonaws.com/a.png", type: "image" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockedAttachmentService.registerPendingAttachment).toHaveBeenCalledWith(
      "https://bucket.s3.amazonaws.com/a.png",
      "image",
      "user1",
    );
  });

  it("rejects a missing url without calling the service", async () => {
    const res = await request(app).post("/contact/attachments").send({ type: "image" });

    expect(res.status).toBe(400);
    expect(mockedAttachmentService.registerPendingAttachment).not.toHaveBeenCalled();
  });

  it("rejects an unsupported type without calling the service", async () => {
    const res = await request(app)
      .post("/contact/attachments")
      .send({ url: "https://bucket.s3.amazonaws.com/a.pdf", type: "pdf" });

    expect(res.status).toBe(400);
    expect(mockedAttachmentService.registerPendingAttachment).not.toHaveBeenCalled();
  });

  it("returns 500 when registering fails", async () => {
    mockedAttachmentService.registerPendingAttachment.mockRejectedValue(new Error("db down"));

    const res = await request(app)
      .post("/contact/attachments")
      .send({ url: "https://bucket.s3.amazonaws.com/a.png", type: "image" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("registers a valid MongoDB-fallback data URI (S3 unavailable) as pending", async () => {
    const dataUri = "data:image/png;base64,aGVsbG8=";
    const created = { id: "att2", url: dataUri, type: "image" };
    mockedAttachmentService.registerPendingAttachment.mockResolvedValue(created as any);

    const res = await request(app)
      .post("/contact/attachments")
      .send({ data: dataUri, type: "image" });

    expect(res.status).toBe(201);
    expect(mockedAttachmentService.registerPendingAttachment).toHaveBeenCalledWith(
      dataUri,
      "image",
      "user1",
    );
  });

  it("rejects a fallback data URI whose type doesn't match the declared type", async () => {
    const res = await request(app)
      .post("/contact/attachments")
      .send({ data: "data:video/webm;base64,aGVsbG8=", type: "image" });

    expect(res.status).toBe(400);
    expect(mockedAttachmentService.registerPendingAttachment).not.toHaveBeenCalled();
  });

  it("rejects a fallback data URI that's too large for MongoDB storage", async () => {
    const oversized = `data:image/png;base64,${"A".repeat(3 * 1024 * 1024)}`;

    const res = await request(app)
      .post("/contact/attachments")
      .send({ data: oversized, type: "image" });

    expect(res.status).toBe(400);
    expect(mockedAttachmentService.registerPendingAttachment).not.toHaveBeenCalled();
  });
});
