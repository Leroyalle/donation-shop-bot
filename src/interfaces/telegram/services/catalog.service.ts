import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { ProductService } from 'src/domain/product/product.service';
import { UiBuilderService } from './ui-builder.service';
import { Region } from 'src/domain/product/types/region.enum';
import { ProductType } from 'src/domain/product/types/product-type.enum';

@Injectable()
export class CatalogService {
  constructor(
    private readonly productService: ProductService,
    private readonly uiBuilderService: UiBuilderService,
  ) {}

  public async showCatalogPage(
    ctx: Context,
    page: number,
    type: ProductType,
    region?: Region,
    editable: boolean = true,
  ) {
    try {
      console.log(typeof editable, editable);
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      const perPage = 1;
      const [cards, totalItems] = await this.productService.getByPage(
        page,
        perPage,
        type,
        region,
      );

      if (cards.length === 0)
        return await ctx.reply('😟 Этих товаров пока нет! Попробуйте позже');

      const { message, keyboards } =
        this.uiBuilderService.buildCardCatalogKeyboard(
          cards[0],
          page,
          totalItems,
          type,
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
    const regions = this.productService.getCardsRegions();
    const keyboard = this.uiBuilderService.buildCardsRegionsList(regions);
    await ctx.reply('Выберите регион:', { reply_markup: keyboard });
  }

  public async showSteamGames(ctx: Context) {
    await ctx.answerCallbackQuery();
    const games = await this.productService.getAllByType(ProductType.GAME);
    if (!games || games.length === 0) {
      return await ctx.reply('😟 Этих товаров пока нет! Попробуйте позже');
    }
    const keyboard = new InlineKeyboard();
    games.map((game) =>
      keyboard
        .text(game.name + ' - ' + game.price + '₽', `buy_steam_game:${game.id}`)
        .row(),
    );
    await ctx.reply('Выберите игру:', { reply_markup: keyboard });
  }
}
