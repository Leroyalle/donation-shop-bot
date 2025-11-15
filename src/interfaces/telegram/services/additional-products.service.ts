import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/shared/constants/api-paths';
import { AdditionalGroup } from 'src/shared/types/additional-group.type';
import { HttpClientService } from 'src/infrastructure/http-client/http-client.service';
import { User } from 'src/domain/user/entities/user.entity';
import { checkProductsIsBanned } from '../lib/check-product-is-banned';

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
        const isBanned = checkProductsIsBanned(group.group);

        if (group.category === 'games' && !isBanned) {
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

      if (!data.forms) {
        return await ctx.reply(`❌ К сожалению, товар ${group} отсутствует`);
      }

      await ctx.conversation.enter('buy-additional', { data, user });
    } catch (error) {
      console.log('[showAdditionalGroups]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }
}
