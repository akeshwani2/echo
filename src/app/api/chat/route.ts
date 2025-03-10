import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isUniqueMemory, mergeMemories } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RateLimiter } from '@/lib/rateLimiter';

const MEMORY_INSTRUCTIONS = `
You are Echo, a friendly AI companion. Your primary purpose is to engage in conversations while remembering important details shared by the user. Listen carefully and store meaningful information they share about themselves, their preferences, and experiences.

Important: You must save key information about the user using memory tags. After your response, add memories like this:
<memory>User's name is [name]</memory>
<memory>User likes [activity/preference]</memory>
<memory>User is from [place]</memory>
<memory>User works as [profession]</memory>

Guidelines for memories:
1. Always format memories exactly as shown above with <memory> tags
2. Start each memory with "User's" or "User"
3. Make memories complete, standalone sentences
4. Only save new, important information
5. Place all memories at the very end of your response
6. Don't save any memories about the emails. Any info you get from the emails should be used to answer the user's question, that's it, don't save any memories about the emails.

Example response:
"Hey! That's so cool that you're from New York! I'd love to hear more about your work as a developer.

<memory>User is from New York</memory>
<memory>User works as a developer</memory>"

Remember: Be conversational first, but never forget to save memories of important details shared by the user.`;

interface ChatMessage {
  isUser: boolean;
  text: string;
}

const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { messages, temperature, systemPrompt, apiKey, maxTokens, model: initialModel, emailData } = await req.json();
    let model = initialModel;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add rate limiting check for Gemini
    if (model === 'gemini-1.5-flash') {
      const rateLimiter = RateLimiter.getInstance();
      if (!rateLimiter.canMakeRequest(userId)) {
        console.log('Rate limit exceeded, falling back to GPT-4o-mini');
        model = 'gpt-4o-mini'; // Force fallback to GPT
      }
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

    if (model === 'gemini-1.5-flash') {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        
        const geminiChat = geminiModel.startChat({
          history: [{
            role: 'user',
            parts: [{ text: `You are Echo, a friendly AI companion. You have access to the user's emails which will be provided as structured data. When discussing emails:
            1. Analyze the email data provided
            2. Answer questions about specific emails
            3. Summarize email content when asked
            4. Help find specific information in emails
            5. Don't save any memories about the emails. Any info you get from the emails should be used to answer the user's question, that's it, don't save any memories about the emails.
            
            ${systemPrompt} ${MEMORY_INSTRUCTIONS}` }],
          }],
        });

        // Structure the context differently
        const context = {
          memories: memoryContext,
          emails: emailData ? `Available Emails: ${JSON.stringify(emailData, null, 2)}` : null,
          userQuery: messages[messages.length - 1].text
        };

        const result = await geminiChat.sendMessage(
          `User Query: ${context.userQuery}\n\n` +
          `${context.memories}\n\n` +
          `${context.emails ? context.emails : 'No email data available for this query.'}`
        );
        const content = result.response.text();
        
        // Extract and process memories
        const newMemories = content.match(/<memory>(.*?)<\/memory>/g)?.map(m => 
          m.replace(/<\/?memory>/g, '').trim()
        ) || [];

        // Save unique memories
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

        // Clean and save the message
        const cleanedText = content
          .replace(/<memory>.*?<\/memory>/g, '')  // Remove memory tags
          .replace(/\(This memory.*?\)/g, '')     // Remove memory reaffirmation notes
          .replace(/\(reaffirming existing memory\)/g, '')  // Remove reaffirmation notes
          .trim();

        const aiMessage = await prisma.message.create({
          data: {
            text: cleanedText,
            isUser: false,
            timestamp: new Date(),
            chatId: chat.id
          }
        });

        const rateLimiter = RateLimiter.getInstance();
        const remainingRequests = rateLimiter.getRemainingRequests(userId);

        return NextResponse.json({
          text: cleanedText,
          isUser: false,
          timestamp: aiMessage.timestamp,
          memories: newMemories,
          remainingRequests,
        });
      } catch (error: any) {
        if (error?.status === 429) {
          console.log('Gemini rate limit hit, falling back to GPT-4o-mini');
          // Fall back to GPT
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { 
                role: "system", 
                content: systemPrompt + MEMORY_INSTRUCTIONS + memoryContext
              },
              ...messages.map((msg: ChatMessage) => ({
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

          const rateLimiter = RateLimiter.getInstance();
          const remainingRequests = rateLimiter.getRemainingRequests(userId);

          return NextResponse.json({
            text: cleanedText,
            isUser: false,
            timestamp: aiMessage.timestamp,
            memories: newMemories,
            remainingRequests,
          });
        } else {
          throw error;
        }
      }
    }

    const response = await openai.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: systemPrompt + MEMORY_INSTRUCTIONS + memoryContext
        },
        ...messages.map((msg: ChatMessage) => ({
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

    const rateLimiter = RateLimiter.getInstance();
    const remainingRequests = rateLimiter.getRemainingRequests(userId);

    return NextResponse.json({
      text: cleanedText,
      isUser: false,
      timestamp: aiMessage.timestamp,
      memories: newMemories,
      remainingRequests,
    });
  
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
} 