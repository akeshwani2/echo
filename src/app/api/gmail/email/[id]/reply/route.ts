import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedGmailClient } from '@/lib/gmail';
import { generateEmailReply } from '@/lib/openai';
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

    // Parse the request body
    const {
      saveDraft = true,
      sendReply = false,
      customInstructions,
      tone,
    } = await req.json();

    // Get user's OAuth tokens
    const userTokens = await prisma.oAuthTokens.findFirst({
      where: { userId, provider: 'google' },
    });

    if (!userTokens) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 });
    }

    // Initialize Gmail client
    const gmail = getAuthenticatedGmailClient({ access_token: userTokens.accessToken });

    // Get the email to reply to
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: params.id,
      format: 'full',
    });

    if (!email.data || !email.data.payload) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Extract email details
    const headers = email.data.payload.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
    
    const from = getHeader('From');
    const to = getHeader('To');
    const subject = getHeader('Subject');
    const date = getHeader('Date');

    // Extract email body
    let body = '';
    
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
      if (part.body?.data) {
        const content = decodeBase64(part.body.data);
        if (part.mimeType === 'text/plain') {
          body = content;
        }
      }

      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    // Process the email payload
    if (email.data.payload.body?.data) {
      body = decodeBase64(email.data.payload.body.data);
    } else if (email.data.payload.parts) {
      email.data.payload.parts.forEach(processPart);
    }

    // Generate the reply
    const replyContent = await generateEmailReply({
      originalEmail: {
        from,
        to,
        subject,
        body,
        date,
      },
      tone,
      userInstructions: customInstructions,
    });

    // Extract the recipient email address
    const recipientEmail = from.match(/<([^>]+)>/) ? from.match(/<([^>]+)>/)?.[1] || from : from;

    // Prepare the reply
    const replyText = `To: ${recipientEmail}
Subject: Re: ${subject}
Content-Type: text/plain; charset="UTF-8"

${replyContent}`;

    let draftId = null;
    let messageId = null;

    // Save as draft if requested
    if (saveDraft && !sendReply) {
      const draft = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            threadId: email.data.threadId,
            raw: Buffer.from(replyText).toString('base64'),
          },
        },
      });

      draftId = draft.data.id;
    }

    // Send the reply if requested
    if (sendReply) {
      const sent = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          threadId: email.data.threadId,
          raw: Buffer.from(replyText).toString('base64'),
        },
      });

      messageId = sent.data.id;
    }

    return NextResponse.json({
      success: true,
      replyContent,
      draftId,
      messageId,
      threadId: email.data.threadId,
    });
  } catch (error) {
    console.error('Error generating reply:', error);
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    );
  }
} 