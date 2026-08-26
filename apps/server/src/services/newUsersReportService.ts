import * as userRepo from "../repositories/userRepository";
import { sendNewUsersReportEmail } from "../utils/email";
import logger from "../logger";

export interface NewUsersReportResult {
  newUsersCount: number;
  adminsNotified: number;
}

/**
 * Builds the "new users" report for the given lookback window and emails it
 * to every admin (role: "admin"). Mirrors the informational-email convention
 * in utils/email.ts: a mail failure is logged but never rejects this call.
 */
export async function sendNewUsersReport(
  days: number,
): Promise<NewUsersReportResult> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [newUsers, adminEmails] = await Promise.all([
    userRepo.getUsersRegisteredSince(since),
    userRepo.getAdminEmails(),
  ]);

  const reportEntries = newUsers.map((user: any) => ({
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    emailVerified: !!user.emailVerified,
    isActive: user.isActive !== false,
  }));

  if (adminEmails.length === 0) {
    logger.warn("New users report requested but no admin users found to notify");
  }

  await Promise.all(
    adminEmails.map((adminEmail: string) =>
      sendNewUsersReportEmail(adminEmail, reportEntries, since),
    ),
  );

  return {
    newUsersCount: reportEntries.length,
    adminsNotified: adminEmails.length,
  };
}
