import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { KeysService } from '../services/keys.service';

@Update()
@Injectable()
export class KeysUpdate {
  constructor(private readonly keysService: KeysService) {}

  @CallbackQuery('keys')
  public async keysCatalog(ctx: Context) {
    await ctx.answerCallbackQuery();
    await ctx.reply('Выберите действие:', {
      reply_markup: new InlineKeyboard([
        [
          {
            text: 'Получить ключ',
            callback_data: 'get_keys:0:false',
          },
          {
            text: 'Продлить ключ',
            callback_data: 'extend_key',
          },
        ],
      ]),
    });
  }

  @CallbackQuery(/^get_keys:/)
  public async getYoutubeKey(ctx: Context) {
    await ctx.answerCallbackQuery();
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, strPage, editable] = data.split(':');
    const page = Number(strPage);
    if (isNaN(page)) return;
    const isEditable = editable === 'true';
    return this.keysService.getKeys(ctx, page, isEditable);
  }

  @CallbackQuery(/^buy_key:/)
  public async buyKey(ctx: Context) {
    await ctx.answerCallbackQuery();
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, productId] = data.split(':');
    return this.keysService.buyKey(ctx, productId);
  }

  @CallbackQuery('extend_key')
  public async extendKey(ctx: Context) {
    await ctx.answerCallbackQuery();
    return this.keysService.extendKey(ctx);
  }
}
