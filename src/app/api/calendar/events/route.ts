import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  fetchCalendarEvents, 
  getWeekEvents, 
  getTodayEvents, 
  getTomorrowEvents,
  getNextWeekEvents,
  getMonthEvents,
  formatCalendarEvents 
} from '@/lib/calendar';

// Add this function to check if calendar access is available
const hasCalendarAccess = (tokens: any): boolean => {
  if (!tokens) return false;
  
  // Check if the token's scope includes any calendar access
  const scope = tokens.scope || '';
  const calendarScopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.events.readonly'
  ];
  
  return calendarScopes.some(calendarScope => scope.includes(calendarScope));
};

export async function POST(req: Request) {
  try {
    // Verify the request is authorized
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const { tokens, timeRange } = await req.json();

    if (!tokens) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 });
    }
    
    // Check if the tokens have calendar access
    if (!hasCalendarAccess(tokens)) {
      return NextResponse.json({ 
        error: 'Calendar access not granted', 
        needsReconnect: true 
      }, { status: 403 });
    }

    let events;
    
    // Fetch events based on the requested time range
    switch (timeRange) {
      case 'today':
        events = await getTodayEvents(tokens);
        break;
      case 'tomorrow':
        events = await getTomorrowEvents(tokens);
        break;
      case 'week':
        events = await getWeekEvents(tokens);
        break;
      case 'nextWeek':
        events = await getNextWeekEvents(tokens);
        break;
      case 'month':
        events = await getMonthEvents(tokens);
        break;
      case 'custom':
        // For custom time range, timeMin and timeMax should be provided
        const { timeMin, timeMax } = await req.json();
        if (!timeMin || !timeMax) {
          return NextResponse.json({ error: 'timeMin and timeMax are required for custom time range' }, { status: 400 });
        }
        events = await fetchCalendarEvents(tokens, timeMin, timeMax);
        break;
      default:
        // Default to current week
        events = await getWeekEvents(tokens);
    }

    // Format the events for display
    const formattedEvents = formatCalendarEvents(events);
    
    return NextResponse.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
} 