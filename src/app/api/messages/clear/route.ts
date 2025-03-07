import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function DELETE() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's chat
    const chat = await prisma.chat.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!chat) {
      return NextResponse.json({ success: true }); // No messages to clear
    }

    // Only delete messages from this chat
    await prisma.message.deleteMany({
      where: { chatId: chat.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear messages:', error);
    return NextResponse.json({ error: 'Failed to clear messages' }, { status: 500 });
  }
}