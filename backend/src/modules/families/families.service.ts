import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FamiliesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, name: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.familyId) throw new BadRequestException('You are already in a family');

    const family = await this.prisma.family.create({
      data: { name, members: { connect: { id: userId } } },
      include: { members: { select: { id: true, name: true, avatar: true, role: true, email: true } } },
    });
    return family;
  }

  async getMyFamily(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { familyId: true } });
    if (!user?.familyId) throw new NotFoundException('You are not in a family');

    return this.prisma.family.findUnique({
      where: { id: user.familyId },
      include: { members: { select: { id: true, name: true, avatar: true, role: true, email: true, isVerified: true } } },
    });
  }

  async join(userId: string, inviteCode: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.familyId) throw new BadRequestException('You are already in a family');

    const family = await this.prisma.family.findUnique({ where: { inviteCode } });
    if (!family) throw new NotFoundException('Invalid invite code');

    await this.prisma.user.update({ where: { id: userId }, data: { familyId: family.id } });

    return this.prisma.family.findUnique({
      where: { id: family.id },
      include: { members: { select: { id: true, name: true, avatar: true, role: true, email: true } } },
    });
  }

  async update(userId: string, data: { name?: string; avatar?: string }) {
    const familyId = await this.getFamilyId(userId);
    return this.prisma.family.update({ where: { id: familyId }, data });
  }

  async leave(userId: string) {
    const familyId = await this.getFamilyId(userId);
    await this.prisma.user.update({ where: { id: userId }, data: { familyId: null } });

    const remaining = await this.prisma.user.count({ where: { familyId } });
    if (remaining === 0) await this.prisma.family.delete({ where: { id: familyId } });

    return { success: true, message: 'Left family' };
  }

  async removeMember(adminId: string, memberId: string) {
    const familyId = await this.getFamilyId(adminId);
    const member = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (member?.familyId !== familyId) throw new ForbiddenException('Member not in your family');
    await this.prisma.user.update({ where: { id: memberId }, data: { familyId: null } });
    return { success: true };
  }

  private async getFamilyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { familyId: true } });
    if (!user?.familyId) throw new NotFoundException('You are not in a family');
    return user.familyId;
  }
}
