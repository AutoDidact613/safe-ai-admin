import cron from 'node-cron';
import * as repository from '../repositories/attachmentRepository';
import * as s3Service from './s3Service';
import logger from '../logger';

const PENDING_MAX_AGE_HOURS = 24;

export const registerPendingAttachment = async (
  url: string,
  type: 'image' | 'video',
  userId: string,
) => {
  return await repository.create({ url, type, userId });
};

export const linkAttachmentsToMessage = async (
  urls: string[],
  userId: string,
  contactMessageId: string,
) => {
  if (!urls || urls.length === 0) return;
  return await repository.markLinkedByUrls(urls, userId, contactMessageId);
};

/**
 * מוחקת מ-S3 ומה-DB כל צירוף שהועלה (status: pending) ומעולם לא שויך
 * לפנייה תוך 24 שעות - כלומר המשתמש/ת צילמה/הקליטה אבל לא שלחה את הטופס.
 */
export const cleanupExpiredPendingAttachments = async () => {
  const cutoffDate = new Date(Date.now() - PENDING_MAX_AGE_HOURS * 60 * 60 * 1000);
  const expired = await repository.findExpiredPending(cutoffDate);

  for (const attachment of expired) {
    try {
      // Fallback attachments stored directly in Mongo (see contactController's
      // registerAttachment) live entirely in the `url` field as a data URI -
      // there's nothing in S3 to delete for those.
      if (!attachment.url.startsWith('data:')) {
        await s3Service.deleteObject(attachment.url);
      }
      await repository.deleteById(attachment.id);
    } catch (error: any) {
      // כשלון בפריט בודד לא אמור לעצור את שאר הניקוי
      logger.error('Failed to clean up expired pending attachment', {
        error: error.message,
        stack: error.stack,
        userId: undefined,
        organizationId: undefined,
        requestId: undefined,
        attachmentId: attachment.id,
        url: attachment.url,
      });
    }
  }
};

/**
 * תזמון קבוע: בכל יום בשעה 03:00 בלילה, ניקוי צירופים יתומים.
 */
export const initializeAttachmentCleanupJob = () => {
  cron.schedule('0 3 * * *', async () => {
    try {
      await cleanupExpiredPendingAttachments();
    } catch (error: any) {
      logger.error('Failed to run attachment cleanup job', {
        error: error.message,
        stack: error.stack,
        userId: undefined,
        organizationId: undefined,
        requestId: undefined,
      });
    }
  });
};
