import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuilderQueueModule } from '../builder/builder-queue.module';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [AuthModule, BuilderQueueModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
