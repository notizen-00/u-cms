import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PluginsModule } from '../plugins/plugins.module';
import { SitesModule } from '../sites/sites.module';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { PublicFormsController } from './public-forms.controller';

@Module({
  imports: [AuthModule, SitesModule, PluginsModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
})
export class FormsModule {}
