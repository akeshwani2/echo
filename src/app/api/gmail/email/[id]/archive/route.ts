import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedGmailClient } from '@/lib/gmail';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify the request is authorized
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's OAuth tokens
    const userTokens = await prisma.oAuthTokens.findFirst({
      where: { userId, provider: 'google' },
    });

    if (!userTokens) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 });
    }

    // Initialize Gmail client
    const gmail = getAuthenticatedGmailClient({ access_token: userTokens.accessToken });

    // Archive the email by removing the INBOX label
    await gmail.users.messages.modify({
      userId: 'me',
      id: params.id,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });

    return NextResponse.json({
      success: true,
      messageId: params.id,
      archived: true,
    });
  } catch (error) {
    console.error('Error archiving email:', error);
    return NextResponse.json(
      { error: 'Failed to archive email' },
      { status: 500 }
    );
  }
} 