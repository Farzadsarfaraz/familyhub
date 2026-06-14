import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TravelService {
  constructor(private prisma: PrismaService) {}

  async getTrips(familyId: string) {
    return this.prisma.trip.findMany({
      where:   { familyId },
      include: {
        itinerary:   { orderBy: [{ day: 'asc' }, { time: 'asc' }] },
        packingList: { orderBy: { name: 'asc' } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async createTrip(familyId: string, userId: string, data: {
    name: string; destination: string; startDate: string; endDate: string;
    budget?: number; coverImage?: string;
  }) {
    return this.prisma.trip.create({
      data: {
        name:        data.name,
        destination: data.destination,
        startDate:   new Date(data.startDate),
        endDate:     new Date(data.endDate),
        budget:      data.budget,
        coverImage:  data.coverImage,
        familyId,
        createdBy:   userId,
      },
      include: { itinerary: true, packingList: true },
    });
  }

  async updateTrip(id: string, data: Partial<{ name: string; destination: string; startDate: string; endDate: string; budget: number; coverImage: string }>) {
    const { startDate, endDate, ...rest } = data;
    return this.prisma.trip.update({
      where: { id },
      data:  {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate   ? { endDate:   new Date(endDate)   } : {}),
      },
      include: { itinerary: true, packingList: true },
    });
  }

  async deleteTrip(id: string) {
    await this.prisma.trip.findUniqueOrThrow({ where: { id } });
    await this.prisma.trip.delete({ where: { id } });
    return { success: true };
  }

  async addItineraryItem(tripId: string, data: { day: number; time?: string; activity: string; location?: string; notes?: string }) {
    return this.prisma.itineraryItem.create({ data: { ...data, tripId } });
  }

  async deleteItineraryItem(id: string) {
    await this.prisma.itineraryItem.findUniqueOrThrow({ where: { id } });
    await this.prisma.itineraryItem.delete({ where: { id } });
    return { success: true };
  }

  async addPackingItem(tripId: string, data: { name: string; qty?: number }) {
    return this.prisma.packingItem.create({ data: { name: data.name, qty: data.qty ?? 1, tripId } });
  }

  async togglePackingItem(id: string) {
    const item = await this.prisma.packingItem.findUniqueOrThrow({ where: { id } });
    return this.prisma.packingItem.update({ where: { id }, data: { packed: !item.packed } });
  }

  async deletePackingItem(id: string) {
    await this.prisma.packingItem.findUniqueOrThrow({ where: { id } });
    await this.prisma.packingItem.delete({ where: { id } });
    return { success: true };
  }
}
