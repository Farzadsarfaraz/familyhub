import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private config:  ConfigService,
    private prisma:  PrismaService,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get('OPENAI_API_KEY') });
  }

  async getDailySummary(familyId: string): Promise<string> {
    const [tasks, events] = await Promise.all([
      this.prisma.task.findMany({
        where:  { familyId, status: 'PENDING' },
        take:   5,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.calendarEvent.findMany({
        where:  { familyId, startDate: { gte: new Date(), lte: new Date(Date.now() + 86400000) } },
        take:   5,
      }),
    ]);

    const prompt = `You are a friendly family assistant. Summarize in 2 short sentences:
Tasks due today: ${tasks.map((t) => t.title).join(', ') || 'none'}
Today's events: ${events.map((e) => e.title).join(', ') || 'none'}
Keep it warm and encouraging.`;

    const response = await this.openai.chat.completions.create({
      model:    'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
    });

    return response.choices[0]?.message?.content ?? 'Have a wonderful family day! 🏡';
  }

  async chat(familyId: string, userId: string, message: string): Promise<string> {
    const [user, recentMemories, recentTasks] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      this.prisma.memory.findMany({ where: { familyId }, take: 10, orderBy: { createdAt: 'desc' }, select: { title: true, description: true, takenAt: true } }),
      this.prisma.task.findMany({ where: { familyId, status: 'PENDING' }, take: 5, select: { title: true, dueDate: true } }),
    ]);

    const systemPrompt = `You are FamilyHub AI, a warm and helpful family assistant for the ${user?.name ?? 'Family'} family.
You have access to their recent memories, tasks, and family information.
Recent memories: ${recentMemories.map((m) => m.title || m.description).filter(Boolean).join('; ')}
Pending tasks: ${recentTasks.map((t) => t.title).join(', ')}
Be concise, friendly, and helpful. Answer questions about family data when you can.`;

    const response = await this.openai.chat.completions.create({
      model:    'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: message },
      ],
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content ?? 'I can help with that! Tell me more.';
  }

  async generateFamilyStory(familyId: string): Promise<string> {
    const memories = await this.prisma.memory.findMany({
      where:   { familyId },
      orderBy: { takenAt: 'asc' },
      take:    20,
      select:  { title: true, description: true, takenAt: true },
    });

    const prompt = `Create a warm, 3-paragraph family story based on these memories:
${memories.map((m) => `- ${m.title || m.description} (${m.takenAt?.getFullYear() ?? 'recent'})`).join('\n')}
Write in a heartfelt, storytelling style.`;

    const response = await this.openai.chat.completions.create({
      model:    'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async suggestMeals(familyId: string): Promise<string[]> {
    const recipes = await this.prisma.recipe.findMany({
      where:  { familyId },
      take:   10,
      select: { name: true, category: true },
    });

    const prompt = `Suggest 7 healthy, family-friendly meal ideas for the week. Return as a JSON array of strings only. ${
      recipes.length ? `They already have these recipes: ${recipes.map((r) => r.name).join(', ')}. Suggest different ones.` : ''
    }`;

    const response = await this.openai.chat.completions.create({
      model:    'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    try {
      const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}');
      return parsed.meals ?? [];
    } catch {
      return ['Pasta Carbonara', 'Grilled Chicken', 'Tacos', 'Stir Fry', 'Pizza', 'Salmon', 'Beef Stew'];
    }
  }
}
