import { syncCalendar, getShelf, getFreshness } from '../calendar/service.js';

await syncCalendar();
const events = await getShelf();
const fresh = getFreshness();
console.log(JSON.stringify({ freshness: fresh, next: events.slice(0, 5) }, null, 2));
