import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isUniqueMemory, mergeMemories } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

const MEMORY_INSTRUCTIONS = `
You are a highly structured conversationalist. Format your responses using these guidelines:

1. Main Response:
- Always start with a clear, direct answer
- Break complex explanations into bullet points or numbered lists
- Use headings (## ) for different sections
- Keep paragraphs short and focused

2. Formatting Rules:
- Use **bold** for key concepts
- Use _italics_ for emphasis
- Use \`code\` for technical terms
- Use > for important quotes or highlights
- Use --- for section breaks

3. Memory System:
When you identify important user information, add it at the end in this format:
<memory>User's name is [name]</memory>
<memory>User likes to [activity/preference]</memory>
<memory>User works as a [profession]</memory>

Always write memories as complete sentences starting with "User's" or "User". Each memory should provide full context when read alone. Only include new information not in existing memories.`;

export async function POST(req: Request) {
  try {
    const { messages, temperature, systemPrompt, apiKey, maxTokens, model } = await req.json();
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create chat for this user
    let chat = await prisma.chat.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: { userId }
      });
    }
    
    // Create OpenAI instance with the client's API key
    const openai = new OpenAI({
      apiKey: apiKey
    });

    // Get existing memories and merge similar ones
    const allMemories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    });
    
    const mergedMemories = mergeMemories(allMemories);

    // Format existing memories for the AI
    const memoryContext = mergedMemories.length > 0
      ? "\n\nExisting memories about the user:\n" + mergedMemories.map(m => `- ${m.text}`).join("\n")
      : "\n\nNo existing memories about the user yet.";

    // Store the user message
    const userMessage = messages[messages.length - 1];
    await prisma.message.create({
      data: {
        text: userMessage.text,
        isUser: true,
        timestamp: new Date(),
        chatId: chat.id
      }
    });

    console.log('Request params:', { model, maxTokens, temperature });

    const response = await openai.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: systemPrompt + MEMORY_INSTRUCTIONS + memoryContext
        },
        ...messages.map((msg: any) => ({
          role: msg.isUser ? "user" : "assistant",
          content: msg.text
        }))
      ],
      temperature: temperature || 0.7,
      max_tokens: maxTokens || 256,
    });

    const content = response.choices[0].message.content;
    const newMemories = content?.match(/<memory>(.*?)<\/memory>/g)?.map(m => 
      m.replace(/<\/?memory>/g, '').trim()
    ) || [];

    // Filter out duplicates and store only new memories
    if (newMemories.length > 0) {
      const uniqueNewMemories = newMemories.filter(
        memory => isUniqueMemory(memory, mergedMemories)
      );

      if (uniqueNewMemories.length > 0) {
        await prisma.memory.createMany({
          data: uniqueNewMemories.map(text => ({
            text,
            timestamp: new Date(),
            userId
          }))
        });
      }
    }

    // Clean the response text and store AI message
    const cleanedText = content?.replace(/<memory>.*?<\/memory>/g, '').trim() || '';
    const aiMessage = await prisma.message.create({
      data: {
        text: cleanedText,
        isUser: false,
        timestamp: new Date(),
        chatId: chat.id
      }
    });

    return NextResponse.json({
      text: cleanedText,
      isUser: false,
      timestamp: aiMessage.timestamp,
      memories: newMemories,
    });
  
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
} 