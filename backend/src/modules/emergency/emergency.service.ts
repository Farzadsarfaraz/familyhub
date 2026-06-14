import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmergencyService {
  constructor(private prisma: PrismaService) {}

  async getContacts(familyId: string) {
    return this.prisma.emergencyContact.findMany({
      where:   { familyId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createContact(familyId: string, data: {
    name: string; relation: string; phone: string;
    emoji?: string; color?: string; priority?: number;
  }) {
    return this.prisma.emergencyContact.create({
      data: { ...data, familyId },
    });
  }

  async updateContact(id: string, data: Partial<{
    name: string; relation: string; phone: string;
    emoji: string; color: string; priority: number;
  }>) {
    return this.prisma.emergencyContact.update({ where: { id }, data });
  }

  async deleteContact(id: string) {
    await this.prisma.emergencyContact.findUniqueOrThrow({ where: { id } });
    await this.prisma.emergencyContact.delete({ where: { id } });
    return { success: true };
  }

  async getMedicalProfiles(familyId: string) {
    return this.prisma.user.findMany({
      where:  { familyId },
      select: {
        id: true, name: true, avatar: true,
        bloodType: true, allergies: true, conditions: true,
        medications: { select: { id: true, name: true, dosage: true } },
      },
    });
  }

  async updateMedicalProfile(userId: string, data: {
    bloodType?: string; allergies?: string[]; conditions?: string[];
  }) {
    return this.prisma.user.update({
      where:  { id: userId },
      data,
      select: { id: true, name: true, bloodType: true, allergies: true, conditions: true },
    });
  }

  async getNearby(familyId: string) {
    return this.prisma.nearbyResource.findMany({
      where:   { familyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createNearby(familyId: string, data: {
    name: string; emoji?: string; address?: string; phone?: string;
  }) {
    return this.prisma.nearbyResource.create({ data: { ...data, familyId } });
  }

  async deleteNearby(id: string) {
    await this.prisma.nearbyResource.findUniqueOrThrow({ where: { id } });
    await this.prisma.nearbyResource.delete({ where: { id } });
    return { success: true };
  }
}
