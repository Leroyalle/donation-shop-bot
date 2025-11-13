import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { TelegramCoreService } from '../services/telegram-core.service';

@Update()
@Injectable()
export class SteamUpdate {
  constructor(private readonly telegramService: TelegramCoreService) {}

  @CallbackQuery('steam')
  async handleSteam(ctx: Context) {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const user = await this.telegramService.handleCreateOrFindUser(ctx);
    if (!user) return;
    await this.telegramService.handleCreateOrFindUser(ctx);
    await ctx.conversation.enter('steam-pay', { user });
  }
}
