import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getForUser(userId: string) {
    return this.prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { success: true };
  }

  async delete(id: string) {
    await this.prisma.notification.findUniqueOrThrow({ where: { id } });
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  async create(userId: string, type: NotificationType, title: string, body: string, data?: any) {
    return this.prisma.notification.create({ data: { userId, type, title, body, data } });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, read: false } });
    return { count };
  }
}
