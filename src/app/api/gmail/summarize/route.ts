import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email || !email.subject || !email.snippet) {
      return NextResponse.json({ error: 'Invalid email data' }, { status: 400 });
    }

    // Combine subject and snippet for context
    const content = `Subject: ${email.subject}\nSnippet: ${email.snippet}`;
    
    let summary = '';

    try {
      // Use Gemini to generate the summary
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const result = await geminiModel.generateContent({
        contents: [{ 
          role: 'user',
          parts: [{ 
            text: `Generate a very short summary (3-5 words max) for this email:\n${content}` 
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 20,
        }
      });
      
      const geminiResponse = result.response;
      summary = geminiResponse.text().trim() || email.subject;
    } catch (error) {
      console.error('Error generating summary with Gemini:', error);
      // Fallback to subject if Gemini fails
      summary = email.subject;
    }

    // Ensure the summary is not too long (max 5 words)
    const words = summary.split(/\s+/);
    if (words.length > 5) {
      summary = words.slice(0, 5).join(' ');
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating email summary:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
} 