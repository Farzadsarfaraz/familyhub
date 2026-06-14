import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, avatar: true,
        role: true, isVerified: true, familyId: true,
        pushToken: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, data: { name?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, avatar: true,
        role: true, isVerified: true, familyId: true, updatedAt: true,
      },
    });
  }

  async updatePushToken(id: string, pushToken: string) {
    await this.prisma.user.update({ where: { id }, data: { pushToken } });
    return { success: true };
  }

  async deleteAccount(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, familyId: true, role: true } });
    if (!user) throw new NotFoundException('User not found');
    // Prevent deleting account if you are the only admin of a family
    if (user.familyId && user.role === 'PARENT') {
      const otherAdmins = await this.prisma.user.count({
        where: { familyId: user.familyId, role: 'PARENT', id: { not: id } },
      });
      if (otherAdmins === 0) {
        const memberCount = await this.prisma.user.count({ where: { familyId: user.familyId, id: { not: id } } });
        if (memberCount > 0) {
          throw new ForbiddenException('You are the only admin of this family. Transfer ownership or remove all members first.');
        }
      }
    }
    // Cascade delete: Prisma schema handles relations with onDelete: Cascade
    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: 'Account deleted' };
  }

  async getFamilyMembers(familyId: string) {
    return this.prisma.user.findMany({
      where: { familyId },
      select: {
        id: true, name: true, avatar: true, role: true, email: true, isVerified: true,
      },
    });
  }
}
