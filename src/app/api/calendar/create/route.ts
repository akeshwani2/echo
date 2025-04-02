import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedCalendarClient } from '@/lib/calendar';

export async function POST(req: Request) {
  try {
    // Verify the request is authorized
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const { 
      summary,
      description,
      startDateTime,
      endDateTime,
      attendees,
      tokens
    } = await req.json();

    if (!tokens) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 });
    }

    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json({ 
        error: 'Event summary, start time, and end time are required' 
      }, { status: 400 });
    }

    // Initialize Calendar client
    const calendar = getAuthenticatedCalendarClient(tokens);

    // Prepare the event
    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/New_York', // You might want to make this dynamic based on user's timezone
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/New_York',
      },
      attendees: attendees?.map((email: string) => ({ email })) || [],
    };

    // Create the event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // Send email updates to attendees
    });

    return NextResponse.json({
      success: true,
      event: response.data
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
} 