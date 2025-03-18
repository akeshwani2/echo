import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedGmailClient } from '@/lib/gmail';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // Verify the request is authorized
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const { 
      instructions, 
      to, 
      saveDraft = false 
    } = await req.json();

    // Validate required fields
    if (!instructions || !to) {
      return NextResponse.json(
        { error: 'Instructions and recipient email are required' }, 
        { status: 400 }
      );
    }

    // Get user's OAuth tokens
    const userTokens = await prisma.oAuthTokens.findFirst({
      where: { userId, provider: 'google' },
    });

    if (!userTokens) {
      return NextResponse.json(
        { error: 'Google account not connected' }, 
        { status: 400 }
      );
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Generate email content with AI
    const prompt = `
    Generate a professional email with the following instructions:
    
    Recipient: ${to}
    Instructions: ${instructions}
    
    Return a JSON object with these fields:
    - subject: A concise, relevant subject line for the email
    - body: The full body text of the email, properly formatted with greeting and signature
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from the response
    let emailContent;
    try {
      // Find JSON object in the text (it might be embedded in markdown or other text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        emailContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (err) {
      console.error('Failed to parse AI response:', text);
      return NextResponse.json({ 
        error: 'Failed to generate email content' 
      }, { status: 500 });
    }

    // Validate generated content
    if (!emailContent.subject || !emailContent.body) {
      return NextResponse.json({ 
        error: 'Failed to generate complete email content' 
      }, { status: 500 });
    }

    let draftId = null;

    // Save as draft if requested
    if (saveDraft) {
      // Initialize Gmail client
      const gmail = getAuthenticatedGmailClient({ access_token: userTokens.accessToken });

      // Prepare the email
      const rawEmail = `From: me
To: ${to}
Subject: ${emailContent.subject}
Content-Type: text/plain; charset="UTF-8"

${emailContent.body}`;

      // Create the draft
      const draftResponse = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: Buffer.from(rawEmail).toString('base64'),
          },
        },
      });

      draftId = draftResponse.data.id || null;
    }

    // Return the generated email content and draft ID if available
    return NextResponse.json({
      emailContent,
      draftId,
    });
    
  } catch (error) {
    console.error('Error generating email:', error);
    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    );
  }
} 