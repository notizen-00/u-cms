import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AppConfigService } from '../../config/app-config.service';
import { setupInitSchema, type SetupInitDto } from './dto/setup-init.dto';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(
    private readonly setupService: SetupService,
    private readonly config: AppConfigService,
  ) {}

  @Get('status')
  status() {
    return this.setupService.getStatus();
  }

  @Post('init')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async init(
    @Body(new ZodValidationPipe(setupInitSchema)) dto: SetupInitDto,
    @Headers('x-setup-token') setupToken: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, site, token, expiresAt } = await this.setupService.init(
      dto,
      setupToken,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    res.cookie(this.config.sessionCookieName, token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      expires: expiresAt,
    });

    return { user, site };
  }
}
