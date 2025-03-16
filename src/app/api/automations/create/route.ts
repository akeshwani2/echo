import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { createAutomationWorkflow } from '@/lib/openai';
import { scheduleTask } from '@/lib/workers/scheduler';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // Verify the request is authorized
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const {
      name,
      description,
      task,
      emailContext,
      userPreferences,
    } = await req.json();

    // Validate required fields
    if (!name || !task) {
      return NextResponse.json(
        { error: 'Name and task are required' },
        { status: 400 }
      );
    }

    // Generate the automation workflow using OpenAI
    const workflow = await createAutomationWorkflow({
      task,
      emailContext,
      userPreferences,
    });

    // Create the automation in the database
    const automation = await prisma.automation.create({
      data: {
        userId,
        name,
        description,
        trigger: workflow.trigger,
        conditions: workflow.conditions,
        actions: workflow.actions,
        isActive: true,
      },
    });

    // If the automation has a time-based trigger, schedule it
    if (workflow.trigger.type === 'time' && workflow.trigger.delay) {
      const scheduledFor = new Date();
      scheduledFor.setMinutes(
        scheduledFor.getMinutes() + parseInt(workflow.trigger.delay)
      );

      await scheduleTask(
        userId,
        'automation_trigger',
        { automationId: automation.id },
        scheduledFor
      );
    }

    return NextResponse.json({
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
        description: automation.description,
        trigger: automation.trigger,
        conditions: automation.conditions,
        actions: automation.actions,
        isActive: automation.isActive,
        createdAt: automation.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    );
  }
} 