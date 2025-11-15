import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { AdditionalProductsService } from '../services/additional-products.service';
import { TProductType } from 'src/shared/types/product-type.type';

@Update()
@Injectable()
export class TopupUpdate {
  constructor(
    private readonly additionalProductsService: AdditionalProductsService,
  ) {}

  // @CallbackQuery(/^topup:/)
  // async getTopup(ctx: Context) {
  //   await ctx.answerCallbackQuery();
  //   const data = ctx.callbackQuery?.data;
  //   if (!data) return;
  //   const [_, productId, type] = data.split(':');
  //   if (!productId || !type) {
  //     return await ctx.reply('❌ Произошла ошибка');
  //   }
  //   await this.additionalProductsService.showAdditionalTopup(
  //     ctx,
  //     productId,
  //     type as TProductType,
  //   );
  // }
}
