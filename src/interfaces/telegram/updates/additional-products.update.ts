import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { TelegramCoreService } from '../services/telegram-core.service';
import { AdditionalProductsService } from '../services/additional-products.service';
import { Context } from 'grammy';
import { TProductType } from 'src/shared/types/product-type.type';

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

  @CallbackQuery(/^additionalBuy:/)
  async handleAdditionalBuy(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const user = await this.telegramService.handleCreateOrFindUser(ctx);
    if (!user) return;
    const [_, id, type, retailPrice] = data.split(':');
    const price = Number(retailPrice);
    return await this.additionalProductsService.handleAdditionalBuy(
      ctx,
      id,
      type as TProductType,
      user,
      price,
    );
  }

  @CallbackQuery(/^additional:/)
  async getAdditionalServices(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, group] = data.split(':');
    await this.additionalProductsService.showAdditionalGroups(ctx, group);
  }
}
