import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { CardService } from 'src/domain/card/card.service';
import { UiBuilderService } from './ui-builder.service';
import { Region } from 'src/domain/card/types/region.enum';

@Injectable()
export class CatalogService {
  constructor(
    private readonly cardService: CardService,
    private readonly uiBuilderService: UiBuilderService,
  ) {}

  public async showCatalogPage(
    ctx: Context,
    page: number,
    region: Region,
    editable: boolean = true,
  ) {
    try {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      const perPage = 1;
      const [cards, totalItems] = await this.cardService.getByPage(
        page,
        perPage,
        region,
      );

      if (cards.length === 0)
        return await ctx.reply('Товаров пока нет! Попробуйте позже');

      const { message, keyboards } =
        this.uiBuilderService.buildCardCatalogKeyboard(
          cards[0],
          page,
          totalItems,
          region,
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

  public async getCardsRegions(ctx: Context) {
    const regions = this.cardService.getCardsRegions();
    const keyboard = this.uiBuilderService.buildCardsRegionsList(regions);
    await ctx.reply('Выберите регион:', { reply_markup: keyboard });
  }
}
