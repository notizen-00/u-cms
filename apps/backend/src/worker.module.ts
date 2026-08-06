import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { BuilderWorkerModule } from './modules/builder/builder-worker.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, BuilderWorkerModule],
})
export class WorkerModule {}
