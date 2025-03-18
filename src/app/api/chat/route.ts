import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isUniqueMemory, mergeMemories } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RateLimiter } from '@/lib/rateLimiter';
import { getAuthenticatedGmailClient } from '@/lib/gmail';
import { generateEmailContent } from '@/lib/openai';

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

// Add a function to detect email sending commands
const isEmailSendCommand = (text: string): { isEmailCommand: boolean, recipient?: string, instructions?: string } => {
  const lowercaseText = text.toLowerCase();
  
  // Check if the message is about sending an email
  if (lowercaseText.includes('send an email') || 
      lowercaseText.includes('send email') || 
      lowercaseText.includes('email to') ||
      (lowercaseText.includes('email') && lowercaseText.includes('send'))) {
      
    // Try to extract email address using regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailRegex);
    const recipient = match ? match[0] : undefined;
    
    if (recipient) {
      // Remove the recipient and command part to get the instructions
      const instructions = text
        .replace(/send an email to/i, '')
        .replace(/send email to/i, '')
        .replace(/email to/i, '')
        .replace(recipient, '')
        .replace(/,/, '')
        .trim();
      
      return { 
        isEmailCommand: true, 
        recipient,
        instructions 
      };
    }
  }
  
  return { isEmailCommand: false };
};

// Add a function to send an email directly
const sendEmail = async (userId: string, recipient: string, instructions: string, requestTokens?: any) => {
  try {
    // First, try to use tokens from the database
    const userTokens = await prisma.oAuthTokens.findFirst({
      where: { userId, provider: 'google' },
    });

    // If no database tokens, check if we have request tokens
    let accessToken = userTokens?.accessToken;
    
    if (!accessToken && requestTokens?.access_token) {
      accessToken = requestTokens.access_token;
      
      // Store these tokens in the database for future use
      await prisma.oAuthTokens.upsert({
        where: {
          userId_provider: {
            userId,
            provider: 'google',
          }
        },
        update: {
          accessToken: requestTokens.access_token,
          refreshToken: requestTokens.refresh_token || null,
          expiryDate: requestTokens.expiry_date ? new Date(requestTokens.expiry_date) : null,
        },
        create: {
          userId,
          provider: 'google',
          accessToken: requestTokens.access_token,
          refreshToken: requestTokens.refresh_token || null,
          expiryDate: requestTokens.expiry_date ? new Date(requestTokens.expiry_date) : null,
        },
      });
    }

    if (!accessToken) {
      return { success: false, error: 'Google account not connected' };
    }

    // Generate email content with AI
    const emailContent = await generateEmailContent({
      recipient,
      instructions,
    });

    // Initialize Gmail client
    const gmail = getAuthenticatedGmailClient({ access_token: accessToken });

    // Prepare the email
    const rawEmail = `From: me
To: ${recipient}
Subject: ${emailContent.subject}
Content-Type: text/plain; charset="UTF-8"

${emailContent.body}`;

    // Send the email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(rawEmail).toString('base64'),
      },
    });

    return { 
      success: true, 
      messageId: response.data.id,
      subject: emailContent.subject 
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
};

export async function POST(req: Request) {
  try {
    const { 
      messages, 
      temperature, 
      systemPrompt, 
      apiKey, 
      maxTokens, 
      model: initialModel, 
      emailData, 
      calendarData,
      gmailTokens 
    } = await req.json();
    let model = initialModel;
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

    // Check if this is an email sending command
    const emailCommand = isEmailSendCommand(userMessage.text);
    if (emailCommand.isEmailCommand && emailCommand.recipient && emailCommand.instructions) {
      // Send the email directly
      const emailResult = await sendEmail(userId, emailCommand.recipient, emailCommand.instructions, gmailTokens);
      
      if (emailResult.success) {
        // Create a response indicating the email was sent
        const responseText = `Okay, I've sent a birthday email to ${emailCommand.recipient}. I didn't include a draft, as requested.`;
        
        // Store the AI response
        const aiMessage = await prisma.message.create({
          data: {
            text: responseText,
            isUser: false,
            timestamp: new Date(),
            chatId: chat.id
          }
        });

        return NextResponse.json({
          text: responseText,
          isUser: false,
          timestamp: aiMessage.timestamp,
          memories: [],
          remainingRequests: 100, // Just a placeholder
        });
      } else {
        // If email sending failed, inform the user
        const errorText = `I couldn't send the email. Error: ${emailResult.error}`;
        
        // Store the error response
        const aiMessage = await prisma.message.create({
          data: {
            text: errorText,
            isUser: false,
            timestamp: new Date(),
            chatId: chat.id
          }
        });

        return NextResponse.json({
          text: errorText,
          isUser: false,
          timestamp: aiMessage.timestamp,
          memories: [],
          remainingRequests: 100, // Just a placeholder
        });
      }
    }

    // Add rate limiting check for Gemini
    if (model === 'gemini-1.5-flash') {
      const rateLimiter = RateLimiter.getInstance();
      if (!rateLimiter.canMakeRequest(userId)) {
        console.log('Rate limit exceeded, falling back to GPT-4o-mini');
        model = 'gpt-4o-mini'; // Force fallback to GPT
      }
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

    console.log('Request params:', { model, maxTokens, temperature });

    if (model === 'gemini-1.5-flash') {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const geminiChat = geminiModel.startChat({
          history: [{
            role: 'user',
            parts: [{ text: `You are Echo, an intelligent email assistant. Your primary purpose is to help users manage and understand their emails while providing relevant insights and assistance.

Core Instructions:
1. Maintain conversational context:
   - Remember the topic being discussed
   - Use previous messages for context
   - Reference previous findings when relevant
   - Use pronouns (it, that, this) appropriately
2. When handling email data:
   - Analyze thoroughly and extract key details
   - Present information clearly and concisely
   - Cite which emails you're referencing
   - Connect information across multiple emails when relevant
   - ALWAYS use empty markdown links to reference emails: [](email_id)
   - NEVER show raw email IDs in the text
   - Format references like this: "Document Title" [](email_id)
   - Example: "Meeting Notes" [](123456)
3. For follow-up questions:
   - Reference previous answers
   - Use context from earlier in the conversation
   - Make connections between related pieces of information
4. When context isn't relevant:
   - Explain why you're switching to general knowledge
   - Maintain a smooth conversation flow

Example of good contextual responses:
User: "When's my next meeting?"
Assistant: "Your next meeting "Team Sync" [](123456) is with Sarah on Tuesday at 2 PM"
User: "What's the link for it?"
Assistant: "The Zoom link for your meeting [](123456) can be found in the calendar invite."

${systemPrompt} ${MEMORY_INSTRUCTIONS}` }],
          }],
        });

        // Structure the context with clear separation and include conversation history
        const context = {
          userQuery: messages[messages.length - 1].text,
          conversationHistory: messages.slice(-5).map((m: ChatMessage) => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.text
          })),
          emailContext: emailData ? `Available Email Data:\n${JSON.stringify(emailData, null, 2)}` : 'No email data available.',
          calendarContext: calendarData ? `Available Calendar Data:\n${JSON.stringify(calendarData, null, 2)}` : 'No calendar data available.',
          memories: memoryContext
        };

        const result = await geminiChat.sendMessage(
          `Current Query: ${context.userQuery}\n\n` +
          `Recent Conversation:\n${context.conversationHistory.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n')}\n\n` +
          `Email Context:\n${context.emailContext}\n\n` +
          `Calendar Context:\n${context.calendarContext}\n\n` +
          `Previous Context:\n${context.memories}`
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
    } else {
      // OpenAI models
      const emailContext = emailData 
        ? `\n\nEmail Context:\n${JSON.stringify(emailData, null, 2)}`
        : '';
      
      const calendarContext = calendarData 
        ? `\n\nCalendar Context:\n${JSON.stringify(calendarData, null, 2)}`
        : '';

      const response = await openai.chat.completions.create({
        model: model || "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: systemPrompt + MEMORY_INSTRUCTIONS + memoryContext + emailContext + calendarContext
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
    }
  
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
} 