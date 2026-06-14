import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MemoriesService {
  constructor(private prisma: PrismaService) {}

  async getMemories(familyId: string, albumId?: string) {
    return this.prisma.memory.findMany({
      where:   { familyId, ...(albumId ? { albumId } : {}) },
      include: {
        uploader: { select: { id: true, name: true, avatar: true } },
        likes:    { select: { userId: true } },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        tags: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMemory(familyId: string, userId: string, data: {
    mediaUrl: string; thumbnailUrl?: string; mediaType?: string;
    title?: string; description?: string; takenAt?: string; albumId?: string;
  }) {
    return this.prisma.memory.create({
      data: {
        mediaUrl:    data.mediaUrl,
        thumbnailUrl: data.thumbnailUrl,
        mediaType:   (data.mediaType as any) ?? 'PHOTO',
        title:       data.title,
        description: data.description,
        takenAt:     data.takenAt ? new Date(data.takenAt) : undefined,
        albumId:     data.albumId,
        familyId,
        uploadedBy:  userId,
      },
      include: { uploader: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async deleteMemory(id: string) {
    await this.prisma.memory.findUniqueOrThrow({ where: { id } });
    await this.prisma.memory.delete({ where: { id } });
    return { success: true };
  }

  async toggleLike(memoryId: string, userId: string) {
    const existing = await this.prisma.memoryLike.findUnique({ where: { memoryId_userId: { memoryId, userId } } });
    if (existing) {
      await this.prisma.memoryLike.delete({ where: { memoryId_userId: { memoryId, userId } } });
      return { liked: false };
    }
    await this.prisma.memoryLike.create({ data: { memoryId, userId } });
    return { liked: true };
  }

  async addComment(memoryId: string, userId: string, content: string) {
    return this.prisma.memoryComment.create({
      data: { memoryId, userId, content },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async getAlbums(familyId: string) {
    return this.prisma.album.findMany({
      where:   { familyId },
      include: { memories: { take: 1, orderBy: { createdAt: 'desc' }, select: { mediaUrl: true, thumbnailUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAlbum(familyId: string, data: { name: string; coverUrl?: string }) {
    return this.prisma.album.create({ data: { name: data.name, coverUrl: data.coverUrl, familyId } });
  }

  async deleteAlbum(id: string) {
    await this.prisma.album.delete({ where: { id } });
  }
}
