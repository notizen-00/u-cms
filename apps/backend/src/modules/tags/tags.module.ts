import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SitesModule } from '../sites/sites.module';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  imports: [AuthModule, SitesModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
