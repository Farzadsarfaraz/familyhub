import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GoalStatus, GoalType } from '@prisma/client';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async list(familyId: string, status?: GoalStatus) {
    return this.prisma.goal.findMany({
      where:   { familyId, ...(status ? { status } : {}) },
      include: {
        creator:   { select: { id: true, name: true, avatar: true } },
        milestones: { orderBy: { id: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(familyId: string, userId: string, data: {
    title: string; description?: string; emoji?: string; type?: GoalType;
    targetDate?: string; assignedTo?: string;
  }) {
    return this.prisma.goal.create({
      data: {
        title:       data.title,
        description: data.description,
        emoji:       data.emoji,
        type:        data.type ?? 'FAMILY',
        targetDate:  data.targetDate ? new Date(data.targetDate) : undefined,
        assignedTo:  data.assignedTo,
        familyId,
        createdBy:   userId,
      },
      include: { creator: { select: { id: true, name: true, avatar: true } }, milestones: true },
    });
  }

  async update(id: string, data: Partial<{ title: string; description: string; emoji: string; status: GoalStatus; progress: number; targetDate: string }>) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');
    const { targetDate, ...rest } = data;
    return this.prisma.goal.update({
      where: { id },
      data:  { ...rest, ...(targetDate ? { targetDate: new Date(targetDate) } : {}) },
      include: { milestones: true },
    });
  }

  async delete(id: string) {
    await this.prisma.goal.findUniqueOrThrow({ where: { id } });
    await this.prisma.goal.delete({ where: { id } });
    return { success: true };
  }

  async addMilestone(goalId: string, title: string) {
    return this.prisma.milestone.create({ data: { goalId, title } });
  }

  async toggleMilestone(id: string) {
    const m = await this.prisma.milestone.findUniqueOrThrow({ where: { id } });
    const completed = !m.completed;
    const updated = await this.prisma.milestone.update({
      where: { id },
      data:  { completed, completedAt: completed ? new Date() : null },
    });
    const all  = await this.prisma.milestone.findMany({ where: { goalId: m.goalId } });
    const done = all.filter(x => x.completed).length;
    const progress = all.length ? Math.round((done / all.length) * 100) : 0;
    await this.prisma.goal.update({ where: { id: m.goalId }, data: { progress } });
    return updated;
  }
}
