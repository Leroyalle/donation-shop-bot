import { Injectable } from '@nestjs/common';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
    return await this.orderRepository.save(order);
  }

  async update(
    id: string,
    order: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>,
  ) {
    return await this.orderRepository.update(id, order);
  }
}
