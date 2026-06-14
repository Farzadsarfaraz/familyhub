import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getMedications(userId: string) {
    return this.prisma.medication.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  }

  async addMedication(userId: string, data: {
    name: string; dosage: string; frequency: string; times?: string[];
  }) {
    return this.prisma.medication.create({
      data: { name: data.name, dosage: data.dosage, frequency: data.frequency, times: data.times ?? [], userId },
    });
  }

  async updateMedication(id: string, data: Partial<{ name: string; dosage: string; frequency: string; times: string[]; active: boolean }>) {
    return this.prisma.medication.update({ where: { id }, data });
  }

  async deleteMedication(id: string) {
    await this.prisma.medication.findUniqueOrThrow({ where: { id } });
    await this.prisma.medication.delete({ where: { id } });
    return { success: true };
  }

  async getAppointments(userId: string) {
    return this.prisma.healthAppointment.findMany({ where: { userId }, orderBy: { date: 'asc' } });
  }

  async addAppointment(userId: string, data: {
    title: string; doctor?: string; location?: string; date: string; notes?: string;
  }) {
    return this.prisma.healthAppointment.create({
      data: { title: data.title, doctor: data.doctor, location: data.location, date: new Date(data.date), notes: data.notes, userId },
    });
  }

  async updateAppointment(id: string, data: Partial<{ title: string; doctor: string; location: string; date: string; notes: string }>) {
    const { date, ...rest } = data;
    return this.prisma.healthAppointment.update({
      where: { id },
      data:  { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
  }

  async deleteAppointment(id: string) {
    await this.prisma.healthAppointment.findUniqueOrThrow({ where: { id } });
    await this.prisma.healthAppointment.delete({ where: { id } });
    return { success: true };
  }

  async getFamilyHealth(familyId: string) {
    const members = await this.prisma.user.findMany({ where: { familyId }, select: { id: true, name: true, avatar: true } });
    const data = await Promise.all(members.map(async m => ({
      ...m,
      medications:  await this.prisma.medication.findMany({ where: { userId: m.id, active: true } }),
      appointments: await this.prisma.healthAppointment.findMany({ where: { userId: m.id, date: { gte: new Date() } }, take: 3, orderBy: { date: 'asc' } }),
    })));
    return data;
  }
}
