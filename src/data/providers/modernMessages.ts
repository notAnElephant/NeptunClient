import type { MessageSummary } from '../../domain/models';
import { parseNeptunDate } from '../date';
import { asRecord, booleanValue, stringValue } from './shared';

export function mapModernMessageSummary(value: unknown): MessageSummary {
  const row = asRecord(value);
  const unreadedPostCount = row.unreadedPostCount;

  return {
    id: stringValue(row, 'messageId', 'id'),
    subject: stringValue(row, 'subject'),
    sender: stringValue(row, 'senderName', 'fromName', 'name'),
    sentAt: parseNeptunDate(row.lastPostDate ?? row.sendDate ?? row.sentAt),
    preview: stringValue(row, 'preview', 'shortText') || undefined,
    isUnread: typeof unreadedPostCount === 'number'
      ? unreadedPostCount > 0
      : booleanValue(row, 'isUnread', 'isNew'),
  };
}
