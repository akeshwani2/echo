import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isUniqueMemory, mergeMemories } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';

const MEMORY_INSTRUCTIONS = `

When you identify any important information about the user, save it as a complete, contextual statement. Include these memories at the end of your message in the following format:

<memory>User's name is [name]</memory>
<memory>User likes to [activity/preference]</memory>
<memory>User works as a [profession]</memory>

Always write memories as complete sentences starting with "User's" or "User". Make sure each memory provides full context even when read in isolation. Only include new information that isn't already in the existing memories. Avoid duplicating memories.`;

export async function POST(req: Request) {
  try {
    const { messages, temperature, systemPrompt, apiKey } = await req.json();
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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