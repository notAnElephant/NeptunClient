import type { CalendarEvent, Exam, MessageDetail } from '../../domain/models';
import { parseNeptunDate } from '../date';
import { asArray, asRecord, booleanValue, stringValue } from './shared';

const calendarIdKeys: Record<string, string[]> = {
  task: ['midTermTaskId'],
  appointment: ['appointmentId'],
  appointmentbooking: ['appointmentBookingId'],
  class: ['classInstanceId'],
  consultation: ['consultationAppointmentId'],
  exam: ['examId'],
  studyperiod: ['periodId'],
  subscriptionlist: ['subscriptionListId'],
  holiday: ['holidayId'],
};

export function mapModernCalendarEvent(value: unknown): CalendarEvent {
  const row = asRecord(value);
  const rawType = stringValue(row, 'eventTypeId', 'calendarEventType', 'type').toLowerCase();
  const title = stringValue(row, 'name', 'title');
  const startsAt = parseNeptunDate(row.startDate ?? row.start);
  const endsAt = parseNeptunDate(row.endDate ?? row.end);
  const location = stringValue(row, 'location', 'roomName', 'room');
  const sourceId = stringValue(row, ...(calendarIdKeys[rawType] ?? []), 'calendarId', 'id', 'calendarEventId');
  return {
    id: sourceId || `${rawType}:${startsAt}:${endsAt}:${title}:${location}`,
    title,
    startsAt,
    endsAt,
    location,
    description: stringValue(row, 'description'),
    type: rawType === 'exam' ? 'exam' : rawType === 'task' ? 'task' : rawType === 'class' ? 'course' : 'other',
  };
}

export function mapModernMessageDetail(messageId: string, value: unknown): MessageDetail {
  const data = asRecord(value);
  const messageData = asRecord(data.messageData);
  const posts = asArray(data.posts).map(asRecord);
  if (!posts.length) throw new Error('Message has no posts');
  const post = posts[posts.length - 1];
  const senderUserId = stringValue(post, 'senderUserId');
  const sender = asArray(data.recipients).map(asRecord).find((recipient) => stringValue(recipient, 'userId') === senderUserId);
  const htmlText = stringValue(post, 'htmlText');
  return {
    id: messageId,
    subject: stringValue(messageData, 'subject'),
    sender: sender ? stringValue(sender, 'printName') : '',
    sentAt: parseNeptunDate(post.sendDate),
    preview: stringValue(post, 'plainTextPreview'),
    isUnread: posts.some((item) => !booleanValue(item, 'isRead')),
    body: htmlText || stringValue(post, 'plainTextPreview'),
  };
}

export function mapModernExams(value: unknown): Exam[] {
  return asArray(value).flatMap((subjectValue) => {
    const subject = asRecord(subjectValue);
    const subjectName = stringValue(subject, 'subjectName', 'name');
    return asArray(subject.examList ?? []).map((examValue) => {
      const exam = asRecord(examValue);
      return {
        id: stringValue(exam, 'examId', 'id'),
        subject: subjectName || stringValue(exam, 'subjectName', 'name'),
        startsAt: parseNeptunDate(exam.fromDate ?? exam.startDate ?? exam.examDate),
        location: stringValue(exam, 'room', 'roomName', 'location'),
        result: stringValue(exam, 'result'),
        status: stringValue(exam, 'examType', 'status'),
      };
    });
  });
}
