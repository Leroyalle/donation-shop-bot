import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Context } from 'grammy';
import { CatalogService } from '../services/catalog.service';
import { Injectable } from '@nestjs/common';
import { TelegramService } from '../services/telegram.service';

@Update()
@Injectable()
export class CatalogUpdate {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly telegramService: TelegramService,
  ) {}

  @CallbackQuery(/^catalog:/)
  async getCatalog(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    console.log(data);
    if (!data) return;
    const page = Number(data.split(':')[1]);
    if (isNaN(page)) return;
    await ctx.answerCallbackQuery();
    await this.catalogService.showCatalogPage(ctx, page);
  }

  @CallbackQuery('categories')
  async getCategories(ctx: Context) {
    await ctx.answerCallbackQuery();
    await this.telegramService.showCategories(ctx);
  }
}
