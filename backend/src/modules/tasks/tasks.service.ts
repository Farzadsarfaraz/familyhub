import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaskStatus, TaskPriority } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async list(familyId: string, status?: TaskStatus, assignedTo?: string) {
    return this.prisma.task.findMany({
      where: {
        familyId,
        ...(status     ? { status }     : {}),
        ...(assignedTo ? { assignedTo } : {}),
      },
      include: {
        creator:  { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(familyId: string, userId: string, data: {
    title: string; description?: string; priority?: TaskPriority;
    dueDate?: string; assignedTo?: string; points?: number; recurring?: boolean;
  }) {
    return this.prisma.task.create({
      data: {
        title:       data.title,
        description: data.description,
        priority:    data.priority ?? 'MEDIUM',
        dueDate:     data.dueDate ? new Date(data.dueDate) : undefined,
        assignedTo:  data.assignedTo,
        points:      data.points ?? 5,
        recurring:   data.recurring ?? false,
        familyId,
        createdBy: userId,
      },
      include: {
        creator:  { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async update(id: string, data: Partial<{ title: string; description: string; priority: TaskPriority; dueDate: string; assignedTo: string; status: TaskStatus }>) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    const { dueDate, ...rest } = data;
    return this.prisma.task.update({
      where: { id },
      data: { ...rest, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
      include: {
        creator:  { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async toggleComplete(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    const completed = task.status !== 'COMPLETED';
    return this.prisma.task.update({
      where: { id },
      data: {
        status:      completed ? 'COMPLETED' : 'PENDING',
        completedAt: completed ? new Date()  : null,
      },
      include: {
        creator:  { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async delete(id: string) {
    await this.prisma.task.findUniqueOrThrow({ where: { id } });
    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }

  async leaderboard(familyId: string) {
    const members = await this.prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, avatar: true },
    });
    const results = await Promise.all(
      members.map(async (m) => {
        const tasks = await this.prisma.task.findMany({
          where: { familyId, assignedTo: m.id, status: 'COMPLETED' },
          select: { points: true },
        });
        return { ...m, points: tasks.reduce((s, t) => s + t.points, 0), completed: tasks.length };
      }),
    );
    return results.sort((a, b) => b.points - a.points);
  }
}
