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

  async create(user: Omit<User, 'id'>) {
    return await this.userRepository.save(user);
  }

  async findById(id: string) {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findByTgId(telegramId: number) {
    return await this.userRepository.findOne({
      where: {
        telegramId,
      },
    });
  }
  async createOrFindUser(userData: Omit<User, 'id'>) {
    const user = await this.findByTgId(userData.telegramId);

    if (!user) {
      return await this.userRepository.save({
        name: userData.name,
        username: userData.username,
        telegramId: userData.telegramId,
      });
    }
    return user;
  }
}
