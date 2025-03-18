import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedGmailClient } from '@/lib/gmail';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // Verify the request is authorized
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const { draftId, tokens } = await req.json();

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    // First try to get user's OAuth tokens from database
    let userTokens = await prisma.oAuthTokens.findFirst({
      where: { userId, provider: 'google' },
    });

    // If no tokens in database, use the ones from the request
    if (!userTokens && tokens?.access_token) {
      // Initialize Gmail client with request tokens
      const gmail = getAuthenticatedGmailClient({ access_token: tokens.access_token });
      
      // Send the draft
      const response = await gmail.users.drafts.send({
        userId: 'me',
        requestBody: {
          id: draftId
        }
      });

      // Return the sent message details
      return NextResponse.json({
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId
      });
    }

    if (!userTokens) {
      return NextResponse.json(
        { error: 'Google account not connected' }, 
        { status: 400 }
      );
    }

    // Initialize Gmail client
    const gmail = getAuthenticatedGmailClient({ access_token: userTokens.accessToken });

    // Send the draft
    const response = await gmail.users.drafts.send({
      userId: 'me',
      requestBody: {
        id: draftId
      }
    });

    // Return the sent message details
    return NextResponse.json({
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    });
    
  } catch (error) {
    console.error('Error sending draft:', error);
    return NextResponse.json(
      { error: 'Failed to send draft' },
      { status: 500 }
    );
  }
} 