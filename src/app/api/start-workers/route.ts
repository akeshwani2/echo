import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processPendingTasks } from '@/lib/workers/scheduler';

// This endpoint will be called by a cron job to process pending tasks
export async function POST(req: Request) {
  try {
    // Verify the request is authorized
    // In production, you would use a more secure authentication method
    // such as a secret token or API key
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process pending tasks
    await processPendingTasks();

    return NextResponse.json({ success: true, message: 'Worker process started' });
  } catch (error) {
    console.error('Error starting worker process:', error);
    return NextResponse.json(
      { error: 'Failed to start worker process' },
      { status: 500 }
    );
  }
} 