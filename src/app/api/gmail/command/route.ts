import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // Verify the request is authorized
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const { command } = await req.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Parse the command with Gemini
    const prompt = `
    Parse the following natural language command related to sending an email. 
    Extract the recipient's email address and the instructions for what the email should contain.
    If the command is not about sending an email, return an error.
    
    Command: "${command}"
    
    Return a JSON object with these fields:
    - action: "send_email" or "error"
    - recipient: the email address of the recipient (only if action is "send_email")
    - instructions: detailed instructions about what the email should contain (only if action is "send_email")
    - error: error message (only if action is "error")
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from the response (handle potential non-JSON output)
    let parsedResult;
    try {
      // Find JSON object in the text (it might be embedded in markdown or other text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (err) {
      console.error('Failed to parse AI response:', text);
      return NextResponse.json({ 
        error: 'Failed to understand command' 
      }, { status: 400 });
    }

    // Handle non-email commands
    if (parsedResult.action !== 'send_email') {
      return NextResponse.json({ 
        error: parsedResult.error || 'This command is not supported' 
      }, { status: 400 });
    }

    // Validate extracted data
    if (!parsedResult.recipient || !parsedResult.instructions) {
      return NextResponse.json({ 
        error: 'Could not extract email recipient or instructions from command' 
      }, { status: 400 });
    }

    // Return the parsed command data
    return NextResponse.json({
      action: 'send_email',
      recipient: parsedResult.recipient,
      instructions: parsedResult.instructions
    });
    
  } catch (error) {
    console.error('Error processing command:', error);
    return NextResponse.json(
      { error: 'Failed to process command' },
      { status: 500 }
    );
  }
} 