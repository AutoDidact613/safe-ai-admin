import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as newUsersReportService from "../newUsersReportService";
import * as userRepo from "../../repositories/userRepository";
import { sendNewUsersReportEmail } from "../../utils/email";

jest.mock("../../repositories/userRepository");
jest.mock("../../utils/email");

const mockedUserRepo = jest.mocked(userRepo);
const mockedSendNewUsersReportEmail = jest.mocked(sendNewUsersReportEmail);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("newUsersReportService.sendNewUsersReport", () => {
  it("emails every admin with the users registered in the lookback window", async () => {
    mockedUserRepo.getUsersRegisteredSince.mockResolvedValue([
      {
        name: "Foo Bar",
        email: "foo@example.com",
        createdAt: new Date("2026-08-25T00:00:00Z"),
        emailVerified: true,
        isActive: true,
      },
    ] as any);
    mockedUserRepo.getAdminEmails.mockResolvedValue([
      "admin1@example.com",
      "admin2@example.com",
    ]);

    const result = await newUsersReportService.sendNewUsersReport(1);

    expect(result).toEqual({ newUsersCount: 1, adminsNotified: 2 });
    expect(mockedSendNewUsersReportEmail).toHaveBeenCalledTimes(2);
    expect(mockedSendNewUsersReportEmail).toHaveBeenCalledWith(
      "admin1@example.com",
      [
        expect.objectContaining({
          email: "foo@example.com",
          emailVerified: true,
          isActive: true,
        }),
      ],
      expect.any(Date),
    );
  });

  it("defaults missing emailVerified/isActive to the schema defaults (false/true)", async () => {
    mockedUserRepo.getUsersRegisteredSince.mockResolvedValue([
      {
        email: "bar@example.com",
        createdAt: new Date("2026-08-25T00:00:00Z"),
        // emailVerified/isActive omitted, as .lean() returns for docs where
        // the field was never written (see auth.ts's forum-permission note)
      },
    ] as any);
    mockedUserRepo.getAdminEmails.mockResolvedValue(["admin@example.com"]);

    const result = await newUsersReportService.sendNewUsersReport(1);

    expect(result).toEqual({ newUsersCount: 1, adminsNotified: 1 });
    expect(mockedSendNewUsersReportEmail).toHaveBeenCalledWith(
      "admin@example.com",
      [
        expect.objectContaining({
          email: "bar@example.com",
          emailVerified: false,
          isActive: true,
        }),
      ],
      expect.any(Date),
    );
  });

  it("returns zero admins notified and sends no email when there are no admins", async () => {
    mockedUserRepo.getUsersRegisteredSince.mockResolvedValue([]);
    mockedUserRepo.getAdminEmails.mockResolvedValue([]);

    const result = await newUsersReportService.sendNewUsersReport(1);

    expect(result).toEqual({ newUsersCount: 0, adminsNotified: 0 });
    expect(mockedSendNewUsersReportEmail).not.toHaveBeenCalled();
  });
});
