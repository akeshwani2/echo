import { NextResponse } from 'next/server';
import { gmail_v1, google } from 'googleapis';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tokens from database
    const tokens = await prisma.oAuthTokens.findFirst({
      where: { userId, provider: 'gmail' }
    });

    if (!tokens) {
      return NextResponse.json({ error: 'No Gmail tokens found' }, { status: 401 });
    }

    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate?.getTime()
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get list of recent messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'in:inbox -in:spam -category:promotions -category:updates -category:social -category:forums' // Only show primary inbox emails
    });

    if (!response.data.messages) {
      return NextResponse.json({ emails: [] });
    }

    return NextResponse.json({ emails: response.data.messages });
  } catch (error) {
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
} 