import { describe, expect, it } from 'vitest';
import { mapModernMessageSummary } from './modernMessages';

describe('modern Neptun message normalization', () => {
  it('uses the current received-message date and unread-count fields', () => {
    expect(mapModernMessageSummary({
      messageId: 'message-1',
      senderName: 'Neptun',
      subject: 'Test message',
      lastPostDate: '2026-07-13T15:30:00',
      unreadedPostCount: 2,
    })).toEqual({
      id: 'message-1',
      sender: 'Neptun',
      subject: 'Test message',
      sentAt: new Date('2026-07-13T15:30:00').toISOString(),
      preview: undefined,
      isUnread: true,
    });
  });

  it('marks messages without unread posts as read', () => {
    expect(mapModernMessageSummary({
      messageId: 'message-2',
      lastPostDate: '2026-07-12T10:00:00',
      unreadedPostCount: 0,
    }).isUnread).toBe(false);
  });
});
