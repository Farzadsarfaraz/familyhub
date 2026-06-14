import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GiftStatus } from '@prisma/client';

@Injectable()
export class GiftsService {
  constructor(private prisma: PrismaService) {}

  async getOccasions(familyId: string) {
    return this.prisma.giftOccasion.findMany({
      where:   { familyId },
      include: { gifts: { orderBy: { createdAt: 'asc' } } },
      orderBy: { date: 'asc' },
    });
  }

  async createOccasion(familyId: string, userId: string, data: {
    name: string; date: string; budget?: number;
  }) {
    return this.prisma.giftOccasion.create({
      data: {
        name:      data.name,
        date:      new Date(data.date),
        budget:    data.budget ?? 0,
        familyId,
        createdBy: userId,
      },
      include: { gifts: true },
    });
  }

  async updateOccasion(id: string, data: Partial<{ name: string; date: string; budget: number }>) {
    const { date, ...rest } = data;
    return this.prisma.giftOccasion.update({
      where: { id },
      data:  { ...rest, ...(date ? { date: new Date(date) } : {}) },
      include: { gifts: true },
    });
  }

  async deleteOccasion(id: string) {
    await this.prisma.giftOccasion.findUniqueOrThrow({ where: { id } });
    await this.prisma.giftOccasion.delete({ where: { id } });
    return { success: true };
  }

  async addGift(occasionId: string, userId: string, data: {
    name: string; price?: number; store?: string; emoji?: string; url?: string; notes?: string;
  }) {
    return this.prisma.giftItem.create({
      data: {
        name:       data.name,
        price:      data.price ?? 0,
        store:      data.store,
        emoji:      data.emoji,
        url:        data.url,
        notes:      data.notes,
        occasionId,
        addedBy:    userId,
      },
    });
  }

  async updateGift(id: string, data: Partial<{
    name: string; price: number; store: string; emoji: string;
    url: string; notes: string; status: GiftStatus;
  }>) {
    return this.prisma.giftItem.update({ where: { id }, data });
  }

  async cycleGiftStatus(id: string) {
    const gift = await this.prisma.giftItem.findUniqueOrThrow({ where: { id } });
    const next: Record<GiftStatus, GiftStatus> = {
      IDEA:    'BOUGHT',
      BOUGHT:  'WRAPPED',
      WRAPPED: 'IDEA',
    };
    return this.prisma.giftItem.update({ where: { id }, data: { status: next[gift.status] } });
  }

  async deleteGift(id: string) {
    await this.prisma.giftItem.findUniqueOrThrow({ where: { id } });
    await this.prisma.giftItem.delete({ where: { id } });
    return { success: true };
  }
}
