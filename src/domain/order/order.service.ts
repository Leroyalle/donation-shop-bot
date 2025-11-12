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

  public async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
    return await this.orderRepository.save(order);
  }

  public async update(
    id: string,
    order: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>,
  ) {
    return await this.orderRepository.update(id, order);
  }

  public async findByPaymentId(paymentId: string) {
    return await this.orderRepository.findOne({
      where: { paymentId },
      relations: {
        cart: true,
        user: true,
      },
    });
  }

  public async findById(id: string) {
    return await this.orderRepository.findOne({
      where: { id },
      relations: {
        cart: true,
        user: true,
      },
    });
  }
}
