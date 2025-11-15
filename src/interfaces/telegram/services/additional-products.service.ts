import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/shared/constants/api-paths';
import { AdditionalGroup } from 'src/shared/types/additional-group.type';
import { HttpClientService } from 'src/infrastructure/http-client/http-client.service';
import { User } from 'src/domain/user/entities/user.entity';
import { productsWithoutTopup } from '../constants/additional-products-without-topup.constants';

@Injectable()
export class AdditionalProductsService {
  constructor(private readonly httpClientService: HttpClientService) {}

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

  public async showAdditionalGroups(ctx: Context, group: string, user: User) {
    await ctx.answerCallbackQuery();
    try {
      const { data } =
        await this.httpClientService.payDigitalInstance.get<AdditionalGroup>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.getProductsByGroup,
          {
            params: {
              group,
            },
          },
        );

      const topups = data.forms?.topup_fields?.find(
        (f) => f.name === 'product_id',
      );

      if (!topups || !topups.options) {
        return await ctx.reply(`❌ К сожалению, товар ${group} отсутствует`);
      }

      console.log('before conversaton');

      await ctx.conversation.enter('buy-additional', { data, user });
    } catch (error) {
      console.log('[showAdditionalGroups]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }
}
