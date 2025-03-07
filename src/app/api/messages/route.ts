import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create a chat for this user
    let chat = await prisma.chat.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }).catch(err => {
      console.error('Error finding chat:', err);
      throw err;
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: { userId }
      }).catch(err => {
        console.error('Error creating chat:', err);
        throw err;
      });
    }

    const messages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { timestamp: 'asc' }
    }).catch(err => {
      console.error('Error finding messages:', err);
      throw err;
    });

    return NextResponse.json({ messages, chatId: chat.id });
  } catch (error) {
    console.error('Detailed error in messages route:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}