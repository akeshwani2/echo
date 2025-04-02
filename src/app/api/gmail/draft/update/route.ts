import { NextResponse } from 'next/server';
import { getAuthenticatedGmailClient } from '@/lib/gmail';

export async function POST(req: Request) {
  try {
    const { draftId, to, subject, body, tokens } = await req.json();

    if (!draftId || !to || !subject || !body || !tokens) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Gmail client
    const gmail = getAuthenticatedGmailClient({ access_token: tokens.access_token });

    // Prepare the updated email
    const rawEmail = `From: me
To: ${to}
Subject: ${subject}
Content-Type: text/plain; charset="UTF-8"

${body}`;

    // Update the draft
    await gmail.users.drafts.update({
      userId: 'me',
      id: draftId,
      requestBody: {
        message: {
          raw: Buffer.from(rawEmail).toString('base64'),
        },
      },
    });

    return NextResponse.json({
      success: true,
      draft: {
        to,
        subject,
        body,
        draftId,
      },
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    );
  }
} 