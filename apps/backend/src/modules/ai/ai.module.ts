import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app-config.module';
import { AuthModule } from '../auth/auth.module';
import { SitesModule } from '../sites/sites.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [AppConfigModule, AuthModule, SitesModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
