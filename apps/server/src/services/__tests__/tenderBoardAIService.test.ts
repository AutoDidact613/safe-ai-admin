import { TBAIService, TenderTopicMismatchError } from "../tenderBoardAIService";
import { callAI } from "../aiService";

jest.mock("../aiService", () => ({
  callAI: jest.fn(),
}));
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../../models/tendersBoardLog", () => ({
  TenderLog: {
    create: jest.fn(),
  },
}));
jest.mock("mongoose", () => ({
  ...jest.requireActual("mongoose"),
  Types: {
    ObjectId: {
      isValid: jest.fn().mockReturnValue(true),
    },
  },
}));

describe("TBAIService.generateTenderData - topic guardrail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects with TenderTopicMismatchError when the text is unrelated to a tender request", async () => {
    (callAI as jest.Mock).mockResolvedValueOnce({
      isRelevant: false,
      reason: "שאלה כללית שאינה קשורה ליצירת מכרז",
    });

    await expect(
      TBAIService.generateTenderData("מה מזג האוויר מחר בתל אביב?"),
    ).rejects.toBeInstanceOf(TenderTopicMismatchError);

    // הקריאה השנייה (פירסור המכרז המלא) לא הייתה אמורה לקרות
    expect(callAI).toHaveBeenCalledTimes(1);
  });

  it("proceeds to full parsing and returns tender data when the text is relevant", async () => {
    const mockTenderData = { title: "אתר חדש", productType: "אתר" };
    (callAI as jest.Mock)
      .mockResolvedValueOnce({ isRelevant: true })
      .mockResolvedValueOnce(mockTenderData);

    const result = await TBAIService.generateTenderData(
      "מחפש מישהו שיבנה לי אתר למכירת מוצרים עם תקציב של 5000 שקלים",
    );

    expect(result).toEqual(mockTenderData);
    expect(callAI).toHaveBeenCalledTimes(2);
  });
});
