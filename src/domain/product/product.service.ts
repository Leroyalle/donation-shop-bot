import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { Region } from './types/region.enum';
import { ProductType } from './types/product-type.enum';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly cardRepository: Repository<Product>,
  ) {}
  async getAll() {
    return await this.cardRepository.find();
  }

  async getByPage(
    page: number,
    take: number = 1,
    type: ProductType,
    region?: Region,
  ) {
    return await this.cardRepository.findAndCount({
      skip: page * take,
      take,
      order: { price: 'ASC' },
      where: {
        type,
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
