import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async list(familyId: string, category?: string) {
    return this.prisma.document.findMany({
      where:   { familyId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(familyId: string, userId: string, data: {
    name: string; fileUrl: string; mimeType: string; size: number; category?: string;
  }) {
    return this.prisma.document.create({
      data: {
        name:       data.name,
        fileUrl:    data.fileUrl,
        mimeType:   data.mimeType,
        size:       data.size,
        category:   data.category ?? 'other',
        familyId,
        uploadedBy: userId,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.document.findUniqueOrThrow({ where: { id } });
    await this.prisma.document.delete({ where: { id } });
    return { success: true };
  }
}
