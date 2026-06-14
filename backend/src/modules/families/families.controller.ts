import { Controller, Get, Post, Patch, Delete, Body, Req, Param, UseGuards } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';

class CreateFamilyDto  { @IsString() name: string; }
class JoinFamilyDto    { @IsString() inviteCode: string; }
class UpdateFamilyDto  { @IsOptional() @IsString() name?: string; @IsOptional() @IsString() avatar?: string; }

@UseGuards(JwtAuthGuard)
@Controller('families')
export class FamiliesController {
  constructor(private families: FamiliesService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateFamilyDto) {
    const data = await this.families.create(req.user.id, dto.name);
    return { success: true, data };
  }

  @Get('me')
  async getMyFamily(@Req() req: any) {
    const data = await this.families.getMyFamily(req.user.id);
    return { success: true, data };
  }

  @Post('join')
  async join(@Req() req: any, @Body() dto: JoinFamilyDto) {
    const data = await this.families.join(req.user.id, dto.inviteCode);
    return { success: true, data };
  }

  @Patch('me')
  async update(@Req() req: any, @Body() dto: UpdateFamilyDto) {
    const data = await this.families.update(req.user.id, dto);
    return { success: true, data };
  }

  @Delete('me/leave')
  async leave(@Req() req: any) {
    return this.families.leave(req.user.id);
  }

  @Delete('me/members/:memberId')
  async removeMember(@Req() req: any, @Param('memberId') memberId: string) {
    return this.families.removeMember(req.user.id, memberId);
  }
}
