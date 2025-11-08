import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card) private readonly cardRepository: Repository<Card>,
  ) {}
  async getAll() {
    return await this.cardRepository.find();
  }

  async getByPage(page: number, take: number = 1) {
    return await this.cardRepository.findAndCount({
      skip: page * take,
      take,
      order: { createdAt: 'ASC' },
    });
  }

  async getById(id: string) {
    return await this.cardRepository.findOne({ where: { id } });
  }
}
