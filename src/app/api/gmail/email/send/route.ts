import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedGmailClient } from '@/lib/gmail';
import { generateEmail } from '@/lib/openai';
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
    const {
      to,
      subject,
      body,
      generateContent = false,
      contentInstructions,
      tone,
      scheduleFollowUp = false,
      followUpDelay = 60, // Default to 1 hour
      followUpContent,
    } = await req.json();

    // Validate required fields
    if (!to) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
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

    // Generate email content if requested
    let emailBody = body;
    if (generateContent) {
      emailBody = await generateEmail({
        recipient: to,
        subject,
        tone,
        userInstructions: contentInstructions,
      });
    }

    // Validate email body
    if (!emailBody) {
      return NextResponse.json({ error: 'Email body is required' }, { status: 400 });
    }

    // Prepare the email
    const emailContent = `From: me
To: ${to}
Subject: ${subject}
Content-Type: text/plain; charset="UTF-8"

${emailBody}`;

    // Send the email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(emailContent).toString('base64'),
      },
    });

    // Schedule follow-up if requested
    let followUpTask = null;
    if (scheduleFollowUp && response.data.id && response.data.threadId) {
      // Import the scheduler dynamically to avoid circular dependencies
      const { scheduleEmailFollowUp } = await import('@/lib/workers/scheduler');
      
      // Generate follow-up content if not provided
      let followUpBody = followUpContent;
      if (!followUpBody) {
        followUpBody = `Hello,

I wanted to follow up on my previous email. I haven't heard back from you yet, and I wanted to make sure you received it.

Best regards,
${userTokens.displayName || 'Me'}`;
      }

      // Schedule the follow-up
      followUpTask = await scheduleEmailFollowUp(
        userId,
        response.data.id,
        response.data.threadId,
        to,
        `Re: ${subject}`,
        followUpBody,
        followUpDelay
      );
    }

    return NextResponse.json({
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId,
      followUpScheduled: !!followUpTask,
      followUpTaskId: followUpTask?.id,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 