import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { newsService } from "../newsService";
import { newsRepository } from "../../repositories/newsRepository";
import { INews } from "../../models/news";

jest.mock("../../repositories/newsRepository", () => ({
  newsRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Without this, newsService's logger.info/error calls try to write to a real
// MongoDB connection that doesn't exist in the test environment, causing each
// test to hang for ~10s on a buffering-timeout error (see practicum-session-log.md).
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe("newsService.createNews", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a news article successfully", async () => {
    const input = {
      title: "AI News",
      content: "OpenAI released a new model",
    };

    const createdNews = {
      _id: "1",
      title: "AI News",
      content: "OpenAI released a new model",
      source: "User",
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };




    const mockedRepository = jest.mocked(newsRepository);

    mockedRepository.create.mockResolvedValue(
      createdNews as unknown as INews
    );

    const result = await newsService.createNews(input);

    expect(mockedRepository.create).toHaveBeenCalledWith({
      ...input,
      tags: [],
    });

    expect(result).toEqual(createdNews);
  });
});
    it("should throw error if title is empty", async () => {
         await expect(
         newsService.createNews({ title: "", content: "abc" })
         ).rejects.toThrow("Title is required");
    });

    it("should throw error if content is empty", async () => {
  await expect(
    newsService.createNews({ title: "t", content: "" })
  ).rejects.toThrow("Content is required");
});

it("should return all news", async () => {
  const mockedRepository = jest.mocked(newsRepository);

  mockedRepository.findAll.mockResolvedValue([]);

  const result = await newsService.getAllNews(1, 10);

  expect(mockedRepository.findAll).toHaveBeenCalledWith(1, 10);
  expect(result).toEqual([]);
});

it("should throw error if news not found by id", async () => {
  const mockedRepository = jest.mocked(newsRepository);

  mockedRepository.findById.mockResolvedValue(null as any);

  await expect(
    newsService.getNewsById("123")
  ).rejects.toThrow("News not found");
});

it("should throw error when deleting non existing news", async () => {
  const mockedRepository = jest.mocked(newsRepository);

  mockedRepository.delete.mockResolvedValue(null as any);

  await expect(
    newsService.deleteNews("123")
  ).rejects.toThrow("News not found");
});