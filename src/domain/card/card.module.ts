import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Card])],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
