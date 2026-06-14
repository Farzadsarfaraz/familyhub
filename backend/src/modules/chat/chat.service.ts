import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createMessage(data: {
    roomId: string;
    senderId: string;
    content: string;
    type: string;
    mediaUrl?: string;
    replyTo?: string;
  }) {
    return this.prisma.message.create({
      data: {
        roomId:   data.roomId,
        senderId: data.senderId,
        content:  data.content,
        type:     data.type as any,
        mediaUrl: data.mediaUrl,
        replyTo:  data.replyTo,
      },
      include: {
        sender:    { select: { id: true, name: true, avatar: true } },
        reactions: true,
      },
    });
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.upsert({
      where:  { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
  }

  async getRoomMessages(roomId: string, cursor?: string, take = 30) {
    return this.prisma.message.findMany({
      where:   { roomId },
      take,
      skip:    cursor ? 1 : 0,
      cursor:  cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender:    { select: { id: true, name: true, avatar: true } },
        reactions: true,
      },
    });
  }

  async getOrCreateRoom(familyId: string) {
    const existing = await this.prisma.chatRoom.findFirst({ where: { familyId } });
    if (existing) return existing;
    return this.prisma.chatRoom.create({ data: { familyId, name: 'Family Chat' } });
  }
}
