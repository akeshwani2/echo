// src/app/api/gmail/email/[id]/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/gmail';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = authHeader.split(' ')[1];
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    console.log('Fetching email with ID:', params.id);
    
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: params.id,
      format: 'full',
    });

    console.log('Email payload structure:', JSON.stringify({
      mimeType: email.data.payload?.mimeType,
      hasBody: !!email.data.payload?.body,
      hasParts: !!email.data.payload?.parts,
      numParts: email.data.payload?.parts?.length,
    }, null, 2));

    // Initialize content variables
    let htmlContent = '';
    let plainText = '';

    // Helper function to decode base64 content
    const decodeBase64 = (data: string) => {
      try {
        return Buffer.from(data, 'base64').toString('utf-8');
      } catch (error) {
        console.error('Failed to decode base64:', error);
        return '';
      }
    };

    // Helper function to recursively process MIME parts
    const processPart = (part: any) => {
      console.log('Processing part:', {
        mimeType: part.mimeType,
        hasData: !!part.body?.data,
        hasAttachment: !!part.body?.attachmentId,
        filename: part.filename,
      });

      if (part.body?.data) {
        const content = decodeBase64(part.body.data);
        if (part.mimeType === 'text/html') {
          console.log('Found HTML content, length:', content.length);
          htmlContent = content;
        } else if (part.mimeType === 'text/plain') {
          console.log('Found plain text content, length:', content.length);
          plainText = content;
        }
      }

      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    // Process the email payload
    if (email.data.payload) {
      if (email.data.payload.body?.data) {
        console.log('Processing single-part email');
        const content = decodeBase64(email.data.payload.body.data);
        if (email.data.payload.mimeType === 'text/html') {
          htmlContent = content;
        } else if (email.data.payload.mimeType === 'text/plain') {
          plainText = content;
        }
      } else if (email.data.payload.parts) {
        console.log('Processing multipart email');
        email.data.payload.parts.forEach(processPart);
      }
    }

    // Get email headers
    const headers = email.data.payload?.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';

    const response = {
      id: email.data.id,
      threadId: email.data.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      html: htmlContent || plainText, // Fallback to plain text if no HTML
      body: plainText || htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text
      snippet: email.data.snippet,
      labelIds: email.data.labelIds,
    };

    console.log('Sending response:', {
      hasHtml: !!response.html,
      htmlLength: response.html?.length,
      hasBody: !!response.body,
      bodyLength: response.body?.length,
      subject: response.subject,
      from: response.from,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch email:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email' },
      { status: 500 }
    );
  }
}