import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { Repository } from 'typeorm';
import { Region } from './types/region.enum';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card) private readonly cardRepository: Repository<Card>,
  ) {}
  async getAll() {
    return await this.cardRepository.find();
  }

  async getByPage(page: number, take: number = 1, region: Region) {
    return await this.cardRepository.findAndCount({
      skip: page * take,
      take,
      order: { price: 'ASC' },
      where: {
        region,
      },
    });
  }

  async getById(id: string) {
    return await this.cardRepository.findOne({ where: { id } });
  }

  public getCardsRegions() {
    return Region;
  }
}
