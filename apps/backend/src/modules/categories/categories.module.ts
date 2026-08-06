import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SitesModule } from '../sites/sites.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [AuthModule, SitesModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
