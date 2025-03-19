import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Memory text is required' },
        { status: 400 }
      );
    }

    // Create the new memory
    const now = new Date();
    const newMemory = await prisma.memory.create({
      data: {
        text,
        userId,
        timestamp: now,
        createdAt: now
      }
    });

    return NextResponse.json(newMemory);
  } catch (error) {
    console.error('Create Memory Error:', error);
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    );
  }
} 