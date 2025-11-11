import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/shared/constants/api-paths';
import { AdditionalGroup } from 'src/shared/types/additional-group.type';
import { IProductById } from 'src/shared/types/product-by-id.type';
import { TProductType } from 'src/shared/types/product-type.type';
import { HttpClientService } from 'src/infrastructure/http-client/http-client.service';
import { User } from 'src/domain/user/entities/user.entity';
import { productsWithoutTopup } from '../constants/additional-products-without-topup.constants';
import { increasePriceByPercent } from 'src/shared/lib/increase-price-by-percent.lib';

@Injectable()
export class AdditionalProductsService {
  constructor(private readonly httpClientService: HttpClientService) {}

  public async showAdditionalTopup(
    ctx: Context,
    id: string,
    type: TProductType,
  ) {
    try {
      const { data } =
        await this.httpClientService.payDigitalInstance.get<IProductById>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.getProduct,
          {
            params: {
              product_id: id,
              type,
            },
          },
        );

      if (!data) {
        return await ctx.reply('❌ Произошла ошибка');
      }

      if (!data.in_stock) {
        return await ctx.reply(`Товара ${data.name} нет в наличии`);
      }

      const retailPrice = increasePriceByPercent(data.price);
      const keyboard = new InlineKeyboard();

      keyboard.row({
        text: 'Купить сейчас',
        callback_data: `additionalBuy:${id}:${type}:${retailPrice}`,
      });

      // await this.buyTopupConversation(ctx.conversation, ctx);

      return await ctx.reply(
        `🛍️ <b>Товар</b>\n\n<b>${data.name}</b>\n\n💰 <b><u>${retailPrice} ₽</u></b>`,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      console.log('[showTopup]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async handleAdditionalBuy(
    ctx: Context,
    id: string,
    type: TProductType,
    user: User,
    retailPrice: number,
  ) {
    try {
      await ctx.answerCallbackQuery();
      if (type === 'TOPUP') {
        ctx.session.topupData = { productId: id, retailPrice };
        console.log('SESSION BEFORE', ctx.session);
        await ctx.conversation.enter('buy-topup', { user });
      }

      console.log('after');
    } catch (error) {
      console.log('[handleAdditionalBuy]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async showAdditionalCategories(ctx: Context) {
    try {
      const { data } = await this.httpClientService.payDigitalInstance.get<
        AdditionalGroup[]
      >(PAY_DIGITAL_PAYMENT_ENDPOINTS.getGroups, {
        params: {
          category: 'games',
        },
      });

      const keyboard = new InlineKeyboard();

      data.forEach((group) => {
        const withoutTopup = productsWithoutTopup.find(
          (g) => g === group.group,
        );

        if (group.category === 'games' && !withoutTopup) {
          keyboard.text(group.group, `additional:${group.group}`).row();
        }
      });

      await ctx.reply('Выберите группу:', {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.log('[showAdditionalCategories]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async showAdditionalGroups(ctx: Context, group: string) {
    try {
      await ctx.answerCallbackQuery();

      const { data } =
        await this.httpClientService.payDigitalInstance.get<AdditionalGroup>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.getProductsByGroup,
          {
            params: {
              group,
            },
          },
        );
      console.log('ADDITIONAL,', data);

      const topups = data.forms?.topup_fields?.find(
        (f) => f.name === 'product_id',
      );

      if (!topups || !topups.options) {
        return await ctx.reply(`❌ К сожалению, товар ${group} отсутствует`);
      }

      const keyboard = new InlineKeyboard();
      keyboard.row({
        text: data.short_info,
        callback_data: `noop`,
      });

      topups.options.forEach((topup, i) => {
        if (!topup.price) return;

        if (i % 2 === 0) {
          keyboard.row();
        }

        keyboard.text(
          topup.product + ' - ' + increasePriceByPercent(topup.price) + '₽',
          `topup:${topup.value}:${topup.type}`,
        );
      });

      await ctx.reply('Выбирите товар:', {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.log('[showAdditionalGroups]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }
}
