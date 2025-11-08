import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { CardService } from 'src/domain/card/card.service';
import { UiBuilderService } from './ui-builder.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly cardService: CardService,
    private readonly uiBuilderService: UiBuilderService,
  ) {}

  public async showCatalogPage(
    ctx: Context,
    page: number,
    editable: boolean = true,
  ) {
    try {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      const perPage = 1;
      const [cards, totalItems] = await this.cardService.getByPage(
        page,
        perPage,
      );
      console.log(cards);
      if (cards.length === 0)
        return await ctx.reply('Товаров пока нет! Попробуйте позже');

      const { message, keyboards } =
        this.uiBuilderService.buildCardCatalogKeyboard(
          cards[0],
          page,
          totalItems,
          perPage,
        );

      if (editable) {
        await ctx.editMessageMedia(
          {
            type: 'photo',
            media: cards[0].imageUrl,
            caption: message,
            parse_mode: 'HTML',
          },
          {
            reply_markup: keyboards,
          },
        );
      } else {
        await ctx.replyWithPhoto(cards[0].imageUrl, {
          caption: message,
          parse_mode: 'HTML',
          reply_markup: keyboards,
        });
      }
    } catch (error) {
      console.log('[showCatalogPage]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }
}
