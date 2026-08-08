import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SitesModule } from '../sites/sites.module';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';

@Module({
  imports: [AuthModule, SitesModule],
  controllers: [MenusController],
  providers: [MenusService],
})
export class MenusModule {}
