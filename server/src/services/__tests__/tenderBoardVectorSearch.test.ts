import { smartSearchTenders } from "../tenderBoardService";
import { getEmbedding } from "../embeddingService";
import * as repo from "../../repositories/tenderBoardRepository";

jest.mock("../embeddingService");
jest.mock("../../repositories/tenderBoardRepository");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../../models/tendersBoardLog", () => ({
  TenderLog: { create: jest.fn() },
}));

describe("tenderBoardService.smartSearchTenders (Atlas Vector Search)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("embeds the search text and runs $vectorSearch through the repository", async () => {
    const fakeVector = [0.1, 0.2, 0.3];
    const fakeResults = [{ _id: "1", title: "מכרז אפליקציה", score: 0.92 }];

    (getEmbedding as jest.Mock).mockResolvedValue(fakeVector);
    (repo.vectorSearchTenders as jest.Mock).mockResolvedValue(fakeResults);

    const results = await smartSearchTenders("אפליקציה לניהול מלאי");

    expect(getEmbedding).toHaveBeenCalledWith("אפליקציה לניהול מלאי");
    expect(repo.vectorSearchTenders).toHaveBeenCalledWith(fakeVector, 10);
    expect(results).toEqual(fakeResults);
  });

  it("propagates errors when embedding generation fails", async () => {
    (getEmbedding as jest.Mock).mockRejectedValue(new Error("embedding provider down"));

    await expect(smartSearchTenders("foo")).rejects.toThrow("embedding provider down");
    expect(repo.vectorSearchTenders).not.toHaveBeenCalled();
  });
});
