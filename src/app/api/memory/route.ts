import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const memories = await prisma.memory.findMany({
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