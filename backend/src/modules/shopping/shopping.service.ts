import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ShoppingService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateList(familyId: string, userId: string) {
    const existing = await this.prisma.shoppingList.findFirst({
      where: { familyId },
      include: { items: { orderBy: { checked: 'asc' } } },
    });
    if (existing) return existing;
    return this.prisma.shoppingList.create({
      data: { name: 'Family Shopping List', familyId, createdBy: userId },
      include: { items: true },
    });
  }

  async addItem(listId: string, userId: string, data: {
    name: string; quantity?: number; unit?: string; category?: string; emoji?: string;
  }) {
    return this.prisma.shoppingItem.create({
      data: { ...data, quantity: data.quantity ?? 1, listId, addedBy: userId },
    });
  }

  async updateItem(id: string, data: Partial<{ name: string; quantity: number; checked: boolean; category: string }>) {
    const item = await this.prisma.shoppingItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    return this.prisma.shoppingItem.update({ where: { id }, data });
  }

  async deleteItem(id: string) {
    await this.prisma.shoppingItem.findUniqueOrThrow({ where: { id } });
    await this.prisma.shoppingItem.delete({ where: { id } });
    return { success: true };
  }

  async clearChecked(listId: string) {
    await this.prisma.shoppingItem.deleteMany({ where: { listId, checked: true } });
    return { success: true };
  }
}
