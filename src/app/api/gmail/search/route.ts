// src/app/api/gmail/search/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

interface EmailHeader {
  name: string;
  value: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, tokens } = await request.json();
    console.log('Search query:', query);
    console.log('Received tokens:', tokens);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
    );

    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    console.log('Making Gmail API request...');
    // First try with the specific query
    let response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10
    });

    // If no results, fetch recent emails
    if (!response.data.messages || response.data.messages.length === 0) {
      console.log('No results for specific query, fetching recent emails...');
      response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5
      });
    }

    console.log('Gmail list response:', response.data);

    const messages = response.data.messages || [];
    const emailDetails = await Promise.all(
      messages.map(async (message) => {
        if (!message.id) return null;
        
        try {
          const email = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full' // Changed from 'metadata' to get full message
          });

          const headers = email.data.payload?.headers || [];
          
          return {
            id: email.data.id,
            snippet: email.data.snippet,
            headers,
            date: headers.find(h => h.name === 'Date')?.value,
            subject: headers.find(h => h.name === 'Subject')?.value,
            from: headers.find(h => h.name === 'From')?.value
          };
        } catch (err) {
          console.error('Error fetching email details:', err);
          return null;
        }
      })
    );

    const validEmails = emailDetails.filter(email => email !== null);
    console.log('Returning email details:', validEmails);
    
    if (validEmails.length === 0) {
      return NextResponse.json({ 
        error: 'No emails found',
        details: 'Could not find any matching emails or recent emails'
      }, { status: 404 });
    }

    return NextResponse.json({ emails: validEmails });
  } catch (error) {
    console.error('Gmail search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search emails',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}