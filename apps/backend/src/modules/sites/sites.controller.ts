import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/auth.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import {
  assignMemberSchema,
  type AssignMemberDto,
} from './dto/assign-member.dto';
import { createSiteSchema, type CreateSiteDto } from './dto/create-site.dto';
import { updateSiteSchema, type UpdateSiteDto } from './dto/update-site.dto';
import { SiteAdminGuard } from './guards/site-admin.guard';
import { SitesService } from './sites.service';

@Controller('sites')
@UseGuards(SessionAuthGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  create(@Body(new ZodValidationPipe(createSiteSchema)) dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.findAllForUser(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.findOneForUser(id, user);
  }

  @Patch(':id')
  @UseGuards(SiteAdminGuard)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSiteSchema)) dto: UpdateSiteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sitesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  remove(@Param('id') id: string) {
    return this.sitesService.remove(id);
  }

  @Post(':id/members')
  @UseGuards(SuperAdminGuard)
  addMember(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignMemberSchema)) dto: AssignMemberDto,
  ) {
    return this.sitesService.addMember(id, dto);
  }

  @Delete(':id/members/:userId')
  @UseGuards(SuperAdminGuard)
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.sitesService.removeMember(id, userId);
  }
}
