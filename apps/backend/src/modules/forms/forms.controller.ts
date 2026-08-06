import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PLUGIN_ID as FORM_BUILDER_PLUGIN_ID } from '@unej-cms/plugin-form-builder';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RequirePlugin } from '../plugins/decorators/require-plugin.decorator';
import { PluginActiveGuard } from '../plugins/guards/plugin-active.guard';
import { SiteAdminGuard } from '../sites/guards/site-admin.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { createFormSchema, type CreateFormDto } from './dto/create-form.dto';
import { updateFormSchema, type UpdateFormDto } from './dto/update-form.dto';
import { FormsService } from './forms.service';

@Controller('sites/:siteId/forms')
@UseGuards(SessionAuthGuard, SiteMemberGuard, PluginActiveGuard)
@RequirePlugin(FORM_BUILDER_PLUGIN_ID)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.formsService.listForSite(siteId);
  }

  @Get(':formId')
  findOne(@Param('siteId') siteId: string, @Param('formId') formId: string) {
    return this.formsService.findOne(siteId, formId);
  }

  @Post()
  @UseGuards(SiteAdminGuard)
  create(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(createFormSchema)) dto: CreateFormDto,
  ) {
    return this.formsService.create(siteId, dto);
  }

  @Patch(':formId')
  @UseGuards(SiteAdminGuard)
  update(
    @Param('siteId') siteId: string,
    @Param('formId') formId: string,
    @Body(new ZodValidationPipe(updateFormSchema)) dto: UpdateFormDto,
  ) {
    return this.formsService.update(siteId, formId, dto);
  }

  @Delete(':formId')
  @UseGuards(SiteAdminGuard)
  remove(@Param('siteId') siteId: string, @Param('formId') formId: string) {
    return this.formsService.remove(siteId, formId);
  }

  @Get(':formId/submissions')
  @UseGuards(SiteAdminGuard)
  submissions(@Param('siteId') siteId: string, @Param('formId') formId: string) {
    return this.formsService.listSubmissions(siteId, formId);
  }
}
