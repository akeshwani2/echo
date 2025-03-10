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
        
        // Add this: Get the email body
        const body = email.data.payload?.parts?.[0]?.body?.data || 
                    email.data.payload?.body?.data;

        const decodedBody = body ? 
          Buffer.from(body, 'base64').toString('utf-8') : 
          '';

        return {
          id: email.data.id,
          snippet: email.data.snippet,
          headers,
          date: headers.find(h => h.name === 'Date')?.value,
          subject: headers.find(h => h.name === 'Subject')?.value,
          from: headers.find(h => h.name === 'From')?.value,
          body: decodedBody // Add the full body
        };
      })
    );

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Gmail search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}