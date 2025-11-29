import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Context } from 'grammy';
import { ProductService } from 'src/domain/product/product.service';
import { Product } from 'src/domain/product/entities/product.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TgStarsService {
  constructor(private readonly productService: ProductService) {}
}
