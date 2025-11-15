import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Context } from 'grammy';
import { CatalogService } from '../services/catalog.service';
import { Injectable } from '@nestjs/common';
import { TelegramCoreService } from '../services/telegram-core.service';
import { Region } from 'src/domain/card/types/region.enum';

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
    console.log(data);
    if (!data) return;
    const [_, strPage, region, editable] = data.split(':');
    const page = Number(strPage);
    if (isNaN(page)) return;
    await ctx.answerCallbackQuery();
    await this.catalogService.showCatalogPage(
      ctx,
      page,
      region as Region,
      Boolean(editable),
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
