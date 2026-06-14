import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { PetsService } from './pets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private pets: PetsService) {}

  @Get()
  async getPets(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.pets.getPets(req.user.familyId);
    return { success: true, data };
  }

  @Post()
  async createPet(@Req() req: any, @Body() body: any) {
    const data = await this.pets.createPet(req.user.familyId, body);
    return { success: true, data };
  }

  @Patch(':id')
  async updatePet(@Param('id') id: string, @Body() body: any) {
    const data = await this.pets.updatePet(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async deletePet(@Param('id') id: string) {
    return this.pets.deletePet(id);
  }

  @Post(':id/medications')
  async addMedication(@Param('id') petId: string, @Body() body: any) {
    const data = await this.pets.addMedication(petId, body);
    return { success: true, data };
  }

  @Patch('medications/:id')
  async updateMedication(@Param('id') id: string, @Body() body: any) {
    const data = await this.pets.updateMedication(id, body);
    return { success: true, data };
  }

  @Delete('medications/:id')
  async deleteMedication(@Param('id') id: string) {
    return this.pets.deleteMedication(id);
  }
}
