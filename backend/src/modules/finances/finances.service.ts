import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TransactionType, FinanceCategory } from '@prisma/client';

@Injectable()
export class FinancesService {
  constructor(private prisma: PrismaService) {}

  async getTransactions(familyId: string, month?: string) {
    const where: any = { familyId };
    if (month) {
      const start = new Date(`${month}-01`);
      const end   = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      where.date  = { gte: start, lte: end };
    }
    return this.prisma.transaction.findMany({
      where,
      include: { creator: { select: { id: true, name: true, avatar: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async addTransaction(familyId: string, userId: string, data: {
    title: string; amount: number; type: TransactionType;
    category?: FinanceCategory; date: string; note?: string;
  }) {
    return this.prisma.transaction.create({
      data: {
        title:    data.title,
        amount:   data.amount,
        type:     data.type,
        category: data.category ?? 'OTHER',
        date:     new Date(data.date),
        note:     data.note,
        familyId,
        createdBy: userId,
      },
      include: { creator: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async deleteTransaction(id: string) {
    await this.prisma.transaction.findUniqueOrThrow({ where: { id } });
    await this.prisma.transaction.delete({ where: { id } });
    return { success: true };
  }

  async getBudgets(familyId: string, month: string) {
    return this.prisma.budget.findMany({ where: { familyId, month } });
  }

  async upsertBudget(familyId: string, data: { category: FinanceCategory; limit: number; month: string }) {
    return this.prisma.budget.upsert({
      where:  { familyId_category_month: { familyId, category: data.category, month: data.month } },
      create: { familyId, category: data.category, limit: data.limit, month: data.month },
      update: { limit: data.limit },
    });
  }

  async getSavingsGoals(familyId: string) {
    return this.prisma.savingsGoal.findMany({ where: { familyId }, orderBy: { createdAt: 'desc' } });
  }

  async createSavingsGoal(familyId: string, userId: string, data: {
    name: string; targetAmount: number; targetDate?: string; emoji?: string;
  }) {
    return this.prisma.savingsGoal.create({
      data: {
        name:         data.name,
        targetAmount: data.targetAmount,
        targetDate:   data.targetDate ? new Date(data.targetDate) : undefined,
        emoji:        data.emoji,
        familyId,
        createdBy:    userId,
      },
    });
  }

  async updateSavingsGoal(id: string, data: Partial<{ name: string; targetAmount: number; savedAmount: number; emoji: string }>) {
    await this.prisma.savingsGoal.findUniqueOrThrow({ where: { id } });
    return this.prisma.savingsGoal.update({ where: { id }, data });
  }

  async deleteSavingsGoal(id: string) {
    await this.prisma.savingsGoal.findUniqueOrThrow({ where: { id } });
    await this.prisma.savingsGoal.delete({ where: { id } });
    return { success: true };
  }

  async getSummary(familyId: string, month: string) {
    const start = new Date(`${month}-01`);
    const end   = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    const txns  = await this.prisma.transaction.findMany({ where: { familyId, date: { gte: start, lte: end } } });
    const income  = txns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, transactionCount: txns.length };
  }
}
