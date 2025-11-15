import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { TelegramCoreService } from '../services/telegram-core.service';
import { AdditionalProductsService } from '../services/additional-products.service';
import { Context } from 'grammy';

@Update()
@Injectable()
export class AdditionalProductsUpdate {
  constructor(
    private readonly additionalProductsService: AdditionalProductsService,
    private readonly telegramService: TelegramCoreService,
  ) {}

  @CallbackQuery('additionalCategories')
  async getAdditionalCategories(ctx: Context) {
    await ctx.answerCallbackQuery();
    await this.additionalProductsService.showAdditionalCategories(ctx);
  }

  @CallbackQuery(/^additional:/)
  async getAdditionalServices(ctx: Context) {
    console.log('ADDITIONAL ');
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const user = await this.telegramService.handleCreateOrFindUser(ctx);
    if (!user) return;
    console.log('after user');
    const [_, group] = data.split(':');
    await this.additionalProductsService.showAdditionalGroups(ctx, group, user);
  }
}
