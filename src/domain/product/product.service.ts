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
    private readonly productRepository: Repository<Product>,
  ) {}

  async getAll() {
    return await this.productRepository.find();
  }

  async getAllByType(type: ProductType) {
    return await this.productRepository.find({ where: { type } });
  }

  async getByPage(
    page: number,
    take: number = 1,
    type: ProductType,
    region?: Region,
  ) {
    return await this.productRepository.findAndCount({
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
    return await this.productRepository.findOne({ where: { id } });
  }

  async getByIdAndType(id: string, type: ProductType) {
    return await this.productRepository.findOne({ where: { id, type } });
  }

  async getFirstByType(type: ProductType) {
    return await this.productRepository.findOne({ where: { type } });
  }

  public getCardsRegions() {
    return Region;
  }
}
