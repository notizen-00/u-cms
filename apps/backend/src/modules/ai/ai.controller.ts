import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { AiService } from './ai.service';
import {
  generateContentSchema,
  type GenerateContentDto,
} from './dto/generate-content.dto';

@Controller('sites/:siteId/ai')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  generate(
    @Param('siteId') _siteId: string,
    @Body(new ZodValidationPipe(generateContentSchema)) dto: GenerateContentDto,
  ) {
    return this.aiService.generate(dto);
  }
}
