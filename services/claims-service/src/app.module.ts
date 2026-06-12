import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { DatabaseService } from './database.service';
import { KafkaService } from './kafka.service';

@Module({
  imports: [],
  controllers: [ClaimsController],
  providers: [ClaimsService, DatabaseService, KafkaService],
})
export class AppModule {}

// Made with Bob
