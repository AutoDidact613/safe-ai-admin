import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import { submitContactForm } from "../contactController";
import * as contactMessageService from "../../services/contactMessageService";
import { sendContactEmail } from "../../utils/email";

jest.mock("../../services/contactMessageService");
jest.mock("../../utils/email");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockedService = jest.mocked(contactMessageService);
const mockedSendContactEmail = jest.mocked(sendContactEmail);

type SavedMessage = Awaited<ReturnType<typeof contactMessageService.saveMessage>>;

const app = express();
app.use(express.json());
// Stand-in for authenticateToken: the controller only reads req.user, so
// tests inject it directly instead of exercising real JWT verification.
// (Cast bypasses the global Express.Request.user augmentation, which types
// it more narrowly than what the controller actually reads off it.)
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
  });

  it("saves attachments when provided and valid", async () => {
    mockedService.saveMessage.mockResolvedValue({} as SavedMessage);
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
