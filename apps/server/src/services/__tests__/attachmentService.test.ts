import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import cron from "node-cron";
import * as attachmentService from "../attachmentService";
import * as repository from "../../repositories/attachmentRepository";
import * as s3Service from "../s3Service";

jest.mock("../../repositories/attachmentRepository");
jest.mock("../s3Service");
jest.mock("node-cron", () => ({ schedule: jest.fn() }));
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockedRepository = jest.mocked(repository);
const mockedS3Service = jest.mocked(s3Service);
const mockedCron = jest.mocked(cron);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("attachmentService.registerPendingAttachment", () => {
  it("delegates to the repository with the given url/type/userId", async () => {
    const created = { id: "att1" };
    mockedRepository.create.mockResolvedValue(created as any);

    const result = await attachmentService.registerPendingAttachment(
      "https://bucket.s3.amazonaws.com/a.png",
      "image",
      "user1",
    );

    expect(result).toBe(created);
    expect(mockedRepository.create).toHaveBeenCalledWith({
      url: "https://bucket.s3.amazonaws.com/a.png",
      type: "image",
      userId: "user1",
    });
  });
});

describe("attachmentService.linkAttachmentsToMessage", () => {
  it("delegates to the repository when urls are provided", async () => {
    await attachmentService.linkAttachmentsToMessage(["u1", "u2"], "user1", "msg1");

    expect(mockedRepository.markLinkedByUrls).toHaveBeenCalledWith(["u1", "u2"], "user1", "msg1");
  });

  it("is a no-op when the urls list is empty", async () => {
    await attachmentService.linkAttachmentsToMessage([], "user1", "msg1");

    expect(mockedRepository.markLinkedByUrls).not.toHaveBeenCalled();
  });
});

describe("attachmentService.cleanupExpiredPendingAttachments", () => {
  it("deletes each expired pending attachment from S3 and the DB", async () => {
    mockedRepository.findExpiredPending.mockResolvedValue([
      { id: "att1", url: "https://bucket.s3.amazonaws.com/a.png" },
      { id: "att2", url: "https://bucket.s3.amazonaws.com/b.webm" },
    ] as any);

    await attachmentService.cleanupExpiredPendingAttachments();

    expect(mockedS3Service.deleteObject).toHaveBeenCalledWith("https://bucket.s3.amazonaws.com/a.png");
    expect(mockedS3Service.deleteObject).toHaveBeenCalledWith("https://bucket.s3.amazonaws.com/b.webm");
    expect(mockedRepository.deleteById).toHaveBeenCalledWith("att1");
    expect(mockedRepository.deleteById).toHaveBeenCalledWith("att2");
  });

  it("keeps processing the rest of the batch when one item's S3 deletion fails", async () => {
    mockedRepository.findExpiredPending.mockResolvedValue([
      { id: "att1", url: "https://bucket.s3.amazonaws.com/a.png" },
      { id: "att2", url: "https://bucket.s3.amazonaws.com/b.webm" },
    ] as any);
    mockedS3Service.deleteObject.mockRejectedValueOnce(new Error("s3 down"));

    await attachmentService.cleanupExpiredPendingAttachments();

    // att1 failed, so it's never removed from the DB...
    expect(mockedRepository.deleteById).not.toHaveBeenCalledWith("att1");
    // ...but att2 still gets cleaned up despite att1's failure.
    expect(mockedRepository.deleteById).toHaveBeenCalledWith("att2");
  });

  it("does nothing when there are no expired pending attachments", async () => {
    mockedRepository.findExpiredPending.mockResolvedValue([] as any);

    await attachmentService.cleanupExpiredPendingAttachments();

    expect(mockedS3Service.deleteObject).not.toHaveBeenCalled();
    expect(mockedRepository.deleteById).not.toHaveBeenCalled();
  });

  it("skips the S3 delete for a MongoDB-fallback attachment (data URI), but still removes it from the DB", async () => {
    mockedRepository.findExpiredPending.mockResolvedValue([
      { id: "att1", url: "data:image/png;base64,aGVsbG8=" },
    ] as any);

    await attachmentService.cleanupExpiredPendingAttachments();

    expect(mockedS3Service.deleteObject).not.toHaveBeenCalled();
    expect(mockedRepository.deleteById).toHaveBeenCalledWith("att1");
  });
});

describe("attachmentService.initializeAttachmentCleanupJob", () => {
  it("schedules the daily cleanup at 03:00", () => {
    attachmentService.initializeAttachmentCleanupJob();

    expect(mockedCron.schedule).toHaveBeenCalledWith("0 3 * * *", expect.any(Function));
  });

  it("runs cleanup when the scheduled callback fires, and swallows a cleanup failure", async () => {
    mockedRepository.findExpiredPending.mockRejectedValue(new Error("db down"));

    attachmentService.initializeAttachmentCleanupJob();
    const scheduledCallback = mockedCron.schedule.mock.calls[0]![1] as () => Promise<void>;

    await expect(scheduledCallback()).resolves.toBeUndefined();
  });
});
