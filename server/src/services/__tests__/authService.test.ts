import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import bcrypt from "bcryptjs";
import { forgotPassword, resetPassword } from "../authService";
import { User } from "../../models/user";
import { generateRandomToken } from "../../utils/jwt";
import { sendPasswordResetEmail } from "../../utils/email";

jest.mock("../../models/user", () => ({
  User: {
    findOne: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("../../utils/jwt", () => ({
  generateTokenPair: jest.fn(),
  generateRandomToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

// ממוקקים כדי שהמודול האמיתי (שדורש ENCRYPTION_KEY בזמן טעינה) לא ייטען בכלל
jest.mock("../../utils/crypto", () => ({
  encryptSecret: jest.fn(),
  generateApiKey: jest.fn(),
  getKeyPrefix: jest.fn(),
  hashApiKey: jest.fn(),
}));

jest.mock("../../utils/email", () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// axios ולוגר לא רלוונטיים ל-forgotPassword/resetPassword, אך authService מייבא אותם ברמת הקובץ
jest.mock("axios");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("forgotPassword", () => {
    it("should generate a reset token and send email when user exists", async () => {
      const mockUser = {
        email: "foo@bar.baz",
        name: "Foo Bar",
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        save: jest.fn().mockResolvedValue(undefined),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (generateRandomToken as jest.Mock).mockReturnValue("mock-reset-token");
      (sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await forgotPassword("foo@bar.baz");

      expect(User.findOne).toHaveBeenCalledWith({ email: "foo@bar.baz" });
      expect(mockUser.passwordResetToken).toBe("mock-reset-token");
      expect(mockUser.passwordResetExpires).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        "foo@bar.baz",
        "mock-reset-token",
        "Foo Bar"
      );
      expect(result).toEqual({ success: true });
    });

    it("should lowercase the email before lookup", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await forgotPassword("FOO@BAR.BAZ");

      expect(User.findOne).toHaveBeenCalledWith({ email: "foo@bar.baz" });
    });

    it("should return success without error and without sending email if user does not exist", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await forgotPassword("notfound@bar.baz");

      expect(result).toEqual({ success: true });
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should set expiry to approximately 1 hour from now", async () => {
      const mockUser = {
        email: "foo@bar.baz",
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (generateRandomToken as jest.Mock).mockReturnValue("mock-token");

      const before = Date.now();
      await forgotPassword("foo@bar.baz");
      const after = Date.now();

      const expiresTime = (mockUser as any).passwordResetExpires.getTime();
      expect(expiresTime).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 1000);
      expect(expiresTime).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 1000);
    });
  });

  describe("resetPassword", () => {
    it("should update password and clear reset token when token is valid", async () => {
      const mockUser = {
        password: "old-hashed-password",
        passwordResetToken: "valid-token",
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
        refreshTokens: ["refresh-1", "refresh-2"],
        save: jest.fn().mockResolvedValue(undefined),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hashed-password");

      const result = await resetPassword("valid-token", "NewPass123!");

      expect(User.findOne).toHaveBeenCalledWith({
        passwordResetToken: "valid-token",
        passwordResetExpires: { $gt: expect.any(Date) },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith("NewPass123!", 10);
      expect(mockUser.password).toBe("new-hashed-password");
      expect(mockUser.passwordResetToken).toBeNull();
      expect(mockUser.passwordResetExpires).toBeNull();
      expect(mockUser.refreshTokens).toEqual([]);
      expect(mockUser.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it("should throw error if token does not exist or has expired", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        resetPassword("invalid-or-expired-token", "NewPass123!")
      ).rejects.toThrow("קישור איפוס הסיסמה אינו תקף או שפג תוקפו");

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });
});