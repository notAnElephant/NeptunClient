import { describe, expect, it } from 'vitest';
import { mapModernCalendarEvent, mapModernExams, mapModernMessageDetail } from './modernContract';

describe('modern Neptun contract normalization', () => {
  it('maps calendar event types and their type-specific identifiers', () => {
    expect(mapModernCalendarEvent({
      eventTypeId: 'Class', classInstanceId: 'class-1', name: 'Algorithms',
      startDate: '2026-07-13T08:00:00Z', endDate: '2026-07-13T09:30:00Z', location: 'Q.101',
    })).toEqual({
      id: 'class-1', title: 'Algorithms', startsAt: '2026-07-13T08:00:00.000Z', endsAt: '2026-07-13T09:30:00.000Z',
      location: 'Q.101', description: '', type: 'course',
    });
    expect(mapModernCalendarEvent({
      eventTypeId: 'Exam', examId: 'exam-1', name: 'Algorithms exam',
      startDate: '2026-07-14T08:00:00Z', endDate: '2026-07-14T10:00:00Z',
    }).type).toBe('exam');
  });

  it('maps the message detail envelope and latest post', () => {
    const result = mapModernMessageDetail('message-1', {
      messageData: { subject: 'Important notice' },
      recipients: [{ userId: 'sender-1', printName: 'Registrar' }],
      posts: [
        { senderUserId: 'sender-1', plainTextPreview: 'Hello', htmlText: '<p>Hello <strong>student</strong></p>', sendDate: '2026-07-13T11:00:00Z', isRead: false },
      ],
    });
    expect(result).toEqual({
      id: 'message-1', subject: 'Important notice', sender: 'Registrar', sentAt: '2026-07-13T11:00:00.000Z',
      preview: 'Hello', isUnread: true, body: 'Hello student',
    });
  });

  it('flattens exam subject groups and uses fromDate', () => {
    expect(mapModernExams([{ subjectName: 'Algorithms', examList: [{ examId: 'exam-1', fromDate: '2026-07-20T08:00:00Z', examType: 'Written', room: 'Q.101' }] }])).toEqual([
      { id: 'exam-1', subject: 'Algorithms', startsAt: '2026-07-20T08:00:00.000Z', location: 'Q.101', result: '', status: 'Written' },
    ]);
  });
});
