import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PLUGIN_ID as FORM_BUILDER_PLUGIN_ID } from '@unej-cms/plugin-form-builder';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RequirePlugin } from '../plugins/decorators/require-plugin.decorator';
import { PluginActiveGuard } from '../plugins/guards/plugin-active.guard';
import { submitFormSchema, type SubmitFormDto } from './dto/submit-form.dto';
import { FormsService } from './forms.service';

/**
 * Reached directly from a visitor's browser on the *public static site*
 * (a different origin than the dashboard) — no session guard, since
 * anonymous visitors submit forms. CORS for this one route is enabled
 * separately in main.ts. Still gated behind PluginActiveGuard so a
 * deactivated form-builder stops accepting submissions.
 */
@Controller('sites/:siteId/forms')
@UseGuards(PluginActiveGuard)
@RequirePlugin(FORM_BUILDER_PLUGIN_ID)
export class PublicFormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post(':formId/submit')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  submit(
    @Param('siteId') siteId: string,
    @Param('formId') formId: string,
    @Body(new ZodValidationPipe(submitFormSchema)) dto: SubmitFormDto,
  ) {
    return this.formsService.submit(siteId, formId, dto);
  }
}
