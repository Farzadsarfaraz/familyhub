import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { EmergencyService } from './emergency.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('emergency')
export class EmergencyController {
  constructor(private emergency: EmergencyService) {}

  @Get('contacts')
  async getContacts(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.emergency.getContacts(req.user.familyId);
    return { success: true, data };
  }

  @Post('contacts')
  async createContact(@Req() req: any, @Body() body: any) {
    const data = await this.emergency.createContact(req.user.familyId, body);
    return { success: true, data };
  }

  @Patch('contacts/:id')
  async updateContact(@Param('id') id: string, @Body() body: any) {
    const data = await this.emergency.updateContact(id, body);
    return { success: true, data };
  }

  @Delete('contacts/:id')
  async deleteContact(@Param('id') id: string) {
    return this.emergency.deleteContact(id);
  }

  @Get('medical')
  async getMedicalProfiles(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.emergency.getMedicalProfiles(req.user.familyId);
    return { success: true, data };
  }

  @Patch('medical')
  async updateMedicalProfile(@Req() req: any, @Body() body: any) {
    const data = await this.emergency.updateMedicalProfile(req.user.id, body);
    return { success: true, data };
  }

  @Get('nearby')
  async getNearby(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.emergency.getNearby(req.user.familyId);
    return { success: true, data };
  }

  @Post('nearby')
  async createNearby(@Req() req: any, @Body() body: any) {
    const data = await this.emergency.createNearby(req.user.familyId, body);
    return { success: true, data };
  }

  @Delete('nearby/:id')
  async deleteNearby(@Param('id') id: string) {
    return this.emergency.deleteNearby(id);
  }
}
