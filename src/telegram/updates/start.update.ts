import { InjectBot, Start, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { TelegramService } from '../services/telegram.service';

@Update()
@Injectable()
export class StartUpdate {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly telegramService: TelegramService,
  ) {}

  @Start()
  async onStart(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await this.telegramService.handleCreateOrFindUser(ctx);
    await this.telegramService.sendStartReply(ctx);
  }
}
