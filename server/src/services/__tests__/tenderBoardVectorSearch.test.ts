import { smartSearchTenders } from "../tenderBoardService";
import { getEmbedding } from "../embeddingService";
import { callAI } from "../aiService";
import * as repo from "../../repositories/tenderBoardRepository";

jest.mock("../embeddingService");
jest.mock("../../repositories/tenderBoardRepository");
// smartSearchTenders מריץ סינון רלוונטיות דרך TBAIService.filterRelevantTenders (../aiService),
// שקוראת בפועל ל-OpenAI - חייב מוק, אחרת הטסט מנסה קריאת AI אמיתית וזה נכשל.
jest.mock("../aiService", () => ({
  callAI: jest.fn(),
}));
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
    // תוצאה יחידה, id="1", חייבת לעבור את סינון הרלוונטיות של ה-AI כדי שתישאר בתוצאה הסופית
    (callAI as jest.Mock).mockResolvedValue({ relevantTenderIds: ["1"] });

    const results = await smartSearchTenders("אפליקציה לניהול מלאי");

    expect(getEmbedding).toHaveBeenCalledWith("אפליקציה לניהול מלאי");
    // limit ברירת המחדל הוא 10; smartSearchTenders מרחיב את מאגר המועמדים ל-Math.max(limit*5, 30) = 50
    expect(repo.vectorSearchTenders).toHaveBeenCalledWith(fakeVector, 50);
    expect(results).toEqual(fakeResults);
  });

  it("propagates errors when embedding generation fails", async () => {
    (getEmbedding as jest.Mock).mockRejectedValue(new Error("embedding provider down"));

    await expect(smartSearchTenders("foo")).rejects.toThrow("embedding provider down");
    expect(repo.vectorSearchTenders).not.toHaveBeenCalled();
  });
});
