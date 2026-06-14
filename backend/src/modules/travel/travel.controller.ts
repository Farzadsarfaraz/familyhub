import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { TravelService } from './travel.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('travel')
export class TravelController {
  constructor(private travel: TravelService) {}

  @Get('trips')
  async getTrips(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.travel.getTrips(req.user.familyId);
    return { success: true, data };
  }

  @Post('trips')
  async createTrip(@Req() req: any, @Body() body: any) {
    const data = await this.travel.createTrip(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Patch('trips/:id')
  async updateTrip(@Param('id') id: string, @Body() body: any) {
    const data = await this.travel.updateTrip(id, body);
    return { success: true, data };
  }

  @Delete('trips/:id')
  async deleteTrip(@Param('id') id: string) {
    return this.travel.deleteTrip(id);
  }

  @Post('trips/:id/itinerary')
  async addItineraryItem(@Param('id') tripId: string, @Body() body: any) {
    const data = await this.travel.addItineraryItem(tripId, body);
    return { success: true, data };
  }

  @Delete('itinerary/:id')
  async deleteItineraryItem(@Param('id') id: string) {
    return this.travel.deleteItineraryItem(id);
  }

  @Post('trips/:id/packing')
  async addPackingItem(@Param('id') tripId: string, @Body() body: any) {
    const data = await this.travel.addPackingItem(tripId, body);
    return { success: true, data };
  }

  @Patch('packing/:id/toggle')
  async togglePackingItem(@Param('id') id: string) {
    const data = await this.travel.togglePackingItem(id);
    return { success: true, data };
  }

  @Delete('packing/:id')
  async deletePackingItem(@Param('id') id: string) {
    return this.travel.deletePackingItem(id);
  }
}
