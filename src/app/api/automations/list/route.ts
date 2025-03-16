import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // Verify the request is authorized
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all automations for the user
    const automations = await prisma.automation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Get execution statistics for each automation
    const automationsWithStats = await Promise.all(
      automations.map(async (automation) => {
        const executions = await prisma.automationExecution.findMany({
          where: { automationId: automation.id },
          orderBy: { startedAt: 'desc' },
          take: 5,
        });

        const executionCount = await prisma.automationExecution.count({
          where: { automationId: automation.id },
        });

        const successCount = await prisma.automationExecution.count({
          where: {
            automationId: automation.id,
            status: 'completed',
          },
        });

        const failureCount = await prisma.automationExecution.count({
          where: {
            automationId: automation.id,
            status: 'failed',
          },
        });

        return {
          ...automation,
          recentExecutions: executions,
          stats: {
            total: executionCount,
            success: successCount,
            failure: failureCount,
            successRate: executionCount > 0 ? (successCount / executionCount) * 100 : 0,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      automations: automationsWithStats,
    });
  } catch (error) {
    console.error('Error listing automations:', error);
    return NextResponse.json(
      { error: 'Failed to list automations' },
      { status: 500 }
    );
  }
} 