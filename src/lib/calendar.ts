import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Get an authenticated Google Calendar client
 */
export function getAuthenticatedCalendarClient(tokens: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Fetch calendar events for a specific time range
 */
export async function fetchCalendarEvents(tokens: any, timeMin: string, timeMax: string) {
  const calendar = getAuthenticatedCalendarClient(tokens);
  
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Get events for the current week
 */
export async function getWeekEvents(tokens: any) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  endOfWeek.setHours(23, 59, 59, 999);
  
  return fetchCalendarEvents(
    tokens,
    startOfWeek.toISOString(),
    endOfWeek.toISOString()
  );
}

/**
 * Get events for next week
 */
export async function getNextWeekEvents(tokens: any) {
  const now = new Date();
  const startOfNextWeek = new Date(now);
  startOfNextWeek.setDate(now.getDate() - now.getDay() + 7); // Next Sunday
  startOfNextWeek.setHours(0, 0, 0, 0);
  
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // Next Saturday
  endOfNextWeek.setHours(23, 59, 59, 999);
  
  return fetchCalendarEvents(
    tokens,
    startOfNextWeek.toISOString(),
    endOfNextWeek.toISOString()
  );
}

/**
 * Get events for today
 */
export async function getTodayEvents(tokens: any) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  return fetchCalendarEvents(
    tokens,
    startOfDay.toISOString(),
    endOfDay.toISOString()
  );
}

/**
 * Get events for tomorrow
 */
export async function getTomorrowEvents(tokens: any) {
  const now = new Date();
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setDate(now.getDate() + 1);
  startOfTomorrow.setHours(0, 0, 0, 0);
  
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);
  
  return fetchCalendarEvents(
    tokens,
    startOfTomorrow.toISOString(),
    endOfTomorrow.toISOString()
  );
}

/**
 * Get events for the current month
 */
export async function getMonthEvents(tokens: any) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return fetchCalendarEvents(
    tokens,
    startOfMonth.toISOString(),
    endOfMonth.toISOString()
  );
}

/**
 * Format calendar events for display
 */
export function formatCalendarEvents(events: any[]) {
  return events.map(event => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    
    // Format the start time
    let startTime = 'All day';
    if (event.start.dateTime) {
      const date = new Date(event.start.dateTime);
      startTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Format the date
    const eventDate = new Date(start);
    const formattedDate = eventDate.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      location: event.location || '',
      start,
      end,
      startTime,
      date: formattedDate,
      attendees: event.attendees || [],
      organizer: event.organizer || {},
      link: event.htmlLink || '',
    };
  });
} 