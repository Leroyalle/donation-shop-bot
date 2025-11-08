import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { TelegramService } from '../services/telegram.service';
import { AdditionalProductsService } from '../services/additional-products.service';
import { Context } from 'grammy';
import { TProductType } from 'src/common/types/product-type.type';

@Update()
@Injectable()
export class AdditionalProductsUpdate {
  constructor(
    private readonly additionalProductsService: AdditionalProductsService,
    private readonly telegramService: TelegramService,
  ) {}

  @CallbackQuery('additionalCategories')
  async getAdditionalCategories(ctx: Context) {
    await ctx.answerCallbackQuery();
    await this.additionalProductsService.showAdditionalCategories(ctx);
  }

  @CallbackQuery(/^additionalBuy:/)
  async handleAdditionalBuy(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const user = await this.telegramService.handleCreateOrFindUser(ctx);
    if (!user) return;
    const [_, id, type] = data.split(':');
    return await this.additionalProductsService.handleAdditionalBuy(
      ctx,
      id,
      type as TProductType,
      user,
    );
  }

  @CallbackQuery(/^additional:/)
  async getAdditionalServices(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, group] = data.split(':');
    await this.additionalProductsService.showAdditionalGroups(ctx, group);
  }

  @CallbackQuery(/^topup:/)
  async getTopup(ctx: Context) {
    await ctx.answerCallbackQuery();
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, productId, type] = data.split(':');
    if (!productId || !type) {
      return await ctx.reply('❌ Произошла ошибка');
    }
    await this.additionalProductsService.showAdditionalTopup(
      ctx,
      productId,
      type as TProductType,
    );
  }
}
