import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('health')
export class HealthController {
  constructor(private health: HealthService) {}

  @Get('family')
  async getFamilyHealth(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.health.getFamilyHealth(req.user.familyId);
    return { success: true, data };
  }

  @Get('medications')
  async getMedications(@Req() req: any) {
    const data = await this.health.getMedications(req.user.id);
    return { success: true, data };
  }

  @Post('medications')
  async addMedication(@Req() req: any, @Body() body: any) {
    const data = await this.health.addMedication(req.user.id, body);
    return { success: true, data };
  }

  @Patch('medications/:id')
  async updateMedication(@Param('id') id: string, @Body() body: any) {
    const data = await this.health.updateMedication(id, body);
    return { success: true, data };
  }

  @Delete('medications/:id')
  async deleteMedication(@Param('id') id: string) {
    return this.health.deleteMedication(id);
  }

  @Get('appointments')
  async getAppointments(@Req() req: any) {
    const data = await this.health.getAppointments(req.user.id);
    return { success: true, data };
  }

  @Post('appointments')
  async addAppointment(@Req() req: any, @Body() body: any) {
    const data = await this.health.addAppointment(req.user.id, body);
    return { success: true, data };
  }

  @Patch('appointments/:id')
  async updateAppointment(@Param('id') id: string, @Body() body: any) {
    const data = await this.health.updateAppointment(id, body);
    return { success: true, data };
  }

  @Delete('appointments/:id')
  async deleteAppointment(@Param('id') id: string) {
    return this.health.deleteAppointment(id);
  }
}
