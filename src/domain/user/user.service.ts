import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async create(user: Omit<User, 'id'>) {
    return await this.userRepository.save(user);
  }

  public async findById(id: string) {
    return await this.userRepository.findOne({ where: { id } });
  }

  public async findByTgId(telegramId: number) {
    return await this.userRepository.findOne({
      where: {
        telegramId,
      },
      select: {
        cart: {
          cartItems: true,
        },
      },
    });
  }

  public async findUserByUsername(username: string) {
    return await this.userRepository.findOne({
      where: {
        username,
      },
    });
  }

  public async createOrFindUser(userData: Omit<User, 'id'>) {
    if (!userData.telegramId) return;
    const user = await this.findByTgId(userData.telegramId);

    if (!user) {
      return await this.userRepository.save({
        name: userData.name,
        username: userData.username,
        telegramId: userData.telegramId,
        source: userData.source,
        cart: null,
        orders: [],
      });
    }
    return user;
  }
}
