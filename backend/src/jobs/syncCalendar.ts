import { syncCalendar } from '../calendar/service.js';

export async function syncCalendarJob() {
  return syncCalendar();
}
