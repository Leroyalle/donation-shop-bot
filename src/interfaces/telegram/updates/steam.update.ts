import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { TelegramCoreService } from '../services/telegram-core.service';
import { ProductService } from 'src/domain/product/product.service';

@Update()
@Injectable()
export class SteamUpdate {
  constructor(
    private readonly telegramService: TelegramCoreService,
    private readonly productService: ProductService,
  ) {}

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

  @CallbackQuery(/^buy_steam_game:/)
  async donateSteamGames(ctx: Context) {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const user = await this.telegramService.handleCreateOrFindUser(ctx);
    if (!user) return;
    await this.telegramService.handleCreateOrFindUser(ctx);
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, gameId] = data.split(':');
    const game = await this.productService.getById(gameId);
    if (!game) return;
    await ctx.conversation.enter('buy_steam_game', { user, game });
  }
}
