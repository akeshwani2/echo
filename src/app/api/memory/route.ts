import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memories = await prisma.memory.findMany({
      where: { userId }, // Only get memories for this user
      orderBy: { timestamp: 'desc' }
    });

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Get Memories Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}