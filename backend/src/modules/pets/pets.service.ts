import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PetsService {
  constructor(private prisma: PrismaService) {}

  async getPets(familyId: string) {
    return this.prisma.pet.findMany({
      where:   { familyId },
      include: { medications: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPet(familyId: string, data: {
    name: string; species: string; breed?: string;
    birthDate?: string; avatar?: string; weight?: string;
    color?: string; emoji?: string; nextVet?: string; notes?: string;
  }) {
    return this.prisma.pet.create({
      data: {
        name:      data.name,
        species:   data.species,
        breed:     data.breed,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        avatar:    data.avatar,
        weight:    data.weight,
        color:     data.color,
        emoji:     data.emoji,
        nextVet:   data.nextVet ? new Date(data.nextVet) : undefined,
        notes:     data.notes,
        familyId,
      },
      include: { medications: true },
    });
  }

  async updatePet(id: string, data: Partial<{
    name: string; species: string; breed: string;
    birthDate: string; avatar: string; weight: string;
    color: string; emoji: string; nextVet: string; notes: string;
  }>) {
    const { birthDate, nextVet, ...rest } = data;
    return this.prisma.pet.update({
      where: { id },
      data:  {
        ...rest,
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
        ...(nextVet   ? { nextVet:   new Date(nextVet)   } : {}),
      },
      include: { medications: true },
    });
  }

  async deletePet(id: string) {
    await this.prisma.pet.findUniqueOrThrow({ where: { id } });
    await this.prisma.pet.delete({ where: { id } });
    return { success: true };
  }

  async addMedication(petId: string, data: {
    name: string; dose?: string; schedule?: string; nextDue?: string;
  }) {
    return this.prisma.petMedication.create({
      data: {
        name:     data.name,
        dose:     data.dose,
        schedule: data.schedule,
        nextDue:  data.nextDue ? new Date(data.nextDue) : undefined,
        petId,
      },
    });
  }

  async updateMedication(id: string, data: Partial<{
    name: string; dose: string; schedule: string; nextDue: string;
  }>) {
    const { nextDue, ...rest } = data;
    return this.prisma.petMedication.update({
      where: { id },
      data:  { ...rest, ...(nextDue ? { nextDue: new Date(nextDue) } : {}) },
    });
  }

  async deleteMedication(id: string) {
    await this.prisma.petMedication.findUniqueOrThrow({ where: { id } });
    await this.prisma.petMedication.delete({ where: { id } });
    return { success: true };
  }
}
