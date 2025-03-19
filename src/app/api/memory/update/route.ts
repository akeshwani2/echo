import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, text } = await req.json();

    if (!id || !text) {
      return NextResponse.json(
        { error: 'Memory ID and text are required' },
        { status: 400 }
      );
    }

    // First verify this memory belongs to the user
    const memory = await prisma.memory.findFirst({
      where: { id, userId }
    });

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Update the memory
    const updatedMemory = await prisma.memory.update({
      where: { id },
      data: { 
        text,
        timestamp: new Date() // Update timestamp to reflect edit time
      }
    });

    return NextResponse.json(updatedMemory);
  } catch (error) {
    console.error('Update Memory Error:', error);
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
} 