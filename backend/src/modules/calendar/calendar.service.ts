import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventCategory, RecurrenceType } from '@prisma/client';

export interface CreateEventDto {
  title: string; description?: string; startDate: string; endDate?: string;
  allDay?: boolean; category?: EventCategory; customCategory?: string;
  color?: string; location?: string;
  recurrence?: RecurrenceType; reminders?: number[]; attendeeIds?: string[];
}

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getEvents(familyId: string, from?: string, to?: string) {
    return this.prisma.calendarEvent.findMany({
      where: {
        familyId,
        ...(from || to ? {
          startDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
      },
      include: { creator: { select: { id: true, name: true, avatar: true } }, attendees: true },
      orderBy: { startDate: 'asc' },
    });
  }

  async create(familyId: string, userId: string, dto: CreateEventDto) {
    const { attendeeIds, ...rest } = dto;
    return this.prisma.calendarEvent.create({
      data: {
        ...rest,
        startDate: new Date(dto.startDate),
        endDate:   dto.endDate ? new Date(dto.endDate) : undefined,
        familyId,
        createdBy: userId,
        attendees: attendeeIds?.length
          ? { create: attendeeIds.map((uid) => ({ userId: uid })) }
          : undefined,
      },
      include: { creator: { select: { id: true, name: true, avatar: true } }, attendees: true },
    });
  }

  async update(id: string, userId: string, dto: Partial<CreateEventDto>) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const { attendeeIds, startDate, endDate, ...rest } = dto;
    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate   ? { endDate:   new Date(endDate)   } : {}),
      },
      include: { creator: { select: { id: true, name: true, avatar: true } }, attendees: true },
    });
  }

  async delete(id: string, userId: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    await this.prisma.calendarEvent.delete({ where: { id } });
    return { success: true };
  }
}
