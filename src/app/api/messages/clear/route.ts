import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    await prisma.message.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear messages:', error);
    return NextResponse.json({ error: 'Failed to clear messages' }, { status: 500 });
  }
}