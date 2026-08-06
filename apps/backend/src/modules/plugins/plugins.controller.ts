import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PluginsService } from './plugins.service';

@Controller('plugins')
@UseGuards(SessionAuthGuard)
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get()
  findAll() {
    return this.pluginsService.listCatalog();
  }
}
