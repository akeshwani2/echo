import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    // Create a new OpenAI instance with the provided key
    const openai = new OpenAI({ apiKey });

    // Try to make a simple request to validate the key
    await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1, // Minimize token usage
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Key validation error:', error);
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }
} 