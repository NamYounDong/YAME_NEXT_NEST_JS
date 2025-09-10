import { Module } from '@nestjs/common';
import { DataMLController } from 'src/controllers/data-ml.controller';
import { DataMLService } from 'src/services/data-ml.service';
import { DatabaseModule } from './database.module';

@Module({
    controllers: [DataMLController],
    providers: [DataMLService],
    exports: [DataMLService],
    imports: [DatabaseModule],
})
export class DataMLModule {}