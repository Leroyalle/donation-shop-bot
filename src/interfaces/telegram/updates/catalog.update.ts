import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Context } from 'grammy';
import { CatalogService } from '../services/catalog.service';
import { Injectable } from '@nestjs/common';
import { TelegramCoreService } from '../services/telegram-core.service';
import { Region } from 'src/domain/product/types/region.enum';
import { ProductType } from 'src/domain/product/types/product-type.enum';

@Update()
@Injectable()
export class CatalogUpdate {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly telegramService: TelegramCoreService,
  ) {}

  @CallbackQuery(/^catalog:/)
  public async getCatalog(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, strPage, type, region, editable] = data.split(':');
    const page = Number(strPage);
    console.log(strPage, type, region, editable);
    if (isNaN(page)) return;
    await ctx.answerCallbackQuery();
    const isEditable = editable === 'true';

    const reg = (!region || region === 'undefined' ? undefined : region) as
      | Region
      | undefined;

    await this.catalogService.showCatalogPage(
      ctx,
      page,
      type as ProductType,
      reg,
      isEditable,
    );
  }

  @CallbackQuery('apple_cards')
  public async getCardsCategories(ctx: Context) {
    await ctx.answerCallbackQuery();
    await this.catalogService.getCardsRegions(ctx);
  }

  @CallbackQuery('categories')
  public async getCategories(ctx: Context) {
    await ctx.answerCallbackQuery();
    await this.telegramService.showCategories(ctx);
  }
}
