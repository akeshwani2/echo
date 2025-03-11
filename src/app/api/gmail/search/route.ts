// src/app/api/gmail/search/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

interface EmailHeader {
  name: string;
  value: string;
}

function getOAuthClient(tokens: any): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

export async function POST(req: Request) {
  try {
    const { tokens, query } = await req.json();
    const gmail = google.gmail({ version: 'v1', auth: getOAuthClient(tokens) });

    // Add category:primary to the search query
    const searchResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'category:primary', // This filters to only Primary inbox
      maxResults: 10,
    });

    if (!searchResponse.data.messages) {
      return NextResponse.json({ emails: [] });
    }

    const emails = await Promise.all(
      searchResponse.data.messages.map(async (message) => {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });
        
        const headers = email.data.payload?.headers || [];
        const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
        
        // Add this: Get the email body
        const body = email.data.payload?.parts?.[0]?.body?.data || 
                    email.data.payload?.body?.data;

        const decodedBody = body ? 
          Buffer.from(body, 'base64').toString('utf-8') : 
          '';

        // Enhanced metadata processing
        const subject = getHeader('Subject');
        const type = determineEmailType(subject, decodedBody);
        const importance = determineImportance(email.data.labelIds || [], subject);
        const hasAttachments = email.data.payload?.parts?.some(part => part.filename && part.filename.length > 0) || false;
        
        return {
          id: email.data.id,
          snippet: email.data.snippet,
          type,
          importance,
          hasAttachments,
          headers,
          date: getHeader('Date'),
          subject: subject,
          from: getHeader('From'),
          to: getHeader('To'),
          body: decodedBody,
          labels: email.data.labelIds || []
        };
      })
    );

    // Helper function to determine email type
    function determineEmailType(subject: string, body: string): string {
      const lowerSubject = subject.toLowerCase();
      const lowerBody = body.toLowerCase();
      
      if (lowerSubject.includes('meeting') || lowerSubject.includes('invite') || 
          lowerBody.includes('zoom.us') || lowerBody.includes('meet.google.com')) {
        return 'meeting';
      }
      
      if (lowerSubject.includes('order') || lowerSubject.includes('shipping') || 
          lowerSubject.includes('tracking') || lowerSubject.includes('delivered')) {
        return 'order';
      }
      
      if (lowerSubject.includes('flight') || lowerSubject.includes('itinerary') || 
          lowerSubject.includes('booking') || lowerBody.includes('reservation')) {
        return 'travel';
      }
      
      if (lowerSubject.includes('document') || lowerSubject.includes('shared') || 
          lowerBody.includes('google doc') || lowerBody.includes('google sheet')) {
        return 'document';
      }
      
      return 'general';
    }

    // Helper function to determine importance
    function determineImportance(labels: string[], subject: string): 'high' | 'medium' | 'low' {
      const lowerSubject = subject.toLowerCase();
      
      // Check for explicit importance markers
      if (labels.includes('IMPORTANT') || 
          lowerSubject.includes('urgent') || 
          lowerSubject.includes('asap') ||
          lowerSubject.includes('important')) {
        return 'high';
      }
      
      // Check for potential medium importance indicators
      if (labels.includes('CATEGORY_UPDATES') ||
          lowerSubject.includes('reminder') ||
          lowerSubject.includes('action required')) {
        return 'medium';
      }
      
      return 'low';
    }

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Gmail search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}