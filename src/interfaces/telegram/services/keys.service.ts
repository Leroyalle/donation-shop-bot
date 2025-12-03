import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { Product } from 'src/domain/product/entities/product.entity';
import { ProductService } from 'src/domain/product/product.service';
import { ProductType } from 'src/domain/product/types/product-type.enum';
import { TelegramCoreService } from './telegram-core.service';

@Injectable()
export class KeysService {
  constructor(
    private readonly productService: ProductService,
    private readonly telegramService: TelegramCoreService,
  ) {}

  public async getKeys(ctx: Context, page: number, editable: boolean = true) {
    const [products, totalItems] = await this.productService.getByPage(
      page,
      1,
      ProductType.KEY,
    );

    if (products.length === 0) {
      return await ctx.reply('😟 Этих товаров пока нет! Попробуйте позже');
    }

    const { message, keyboards } = this.buildKeysCatalogKeyboard(
      products[0],
      page,
      totalItems,
    );

    if (editable) {
      await ctx.editMessageMedia(
        {
          type: 'photo',
          media: products[0].imageUrl,
          caption: message,
          parse_mode: 'HTML',
        },
        {
          reply_markup: keyboards,
        },
      );
    } else {
      await ctx.replyWithPhoto(products[0].imageUrl, {
        caption: message,
        parse_mode: 'HTML',
        reply_markup: keyboards,
      });
    }
  }

  public buildKeysCatalogKeyboard(
    product: Product,
    page: number,
    totalItems: number,
    perPage: number = 1,
  ) {
    const message = `<b>${product.name}</b>\n${product.description}`;
    const keyboards = new InlineKeyboard().row({
      text: `Купить - ${product.price} ₽`,
      callback_data: `buy_key:${product.id}`,
    });

    const totalPages = Math.ceil(totalItems / perPage);
    const editable = true;

    const navKeyboard: { text: string; callback_data: string }[] = [];
    if (page > 0) {
      navKeyboard.push({
        text: '←',
        callback_data: `get_keys:${page - 1}:${editable}`,
      });
    }
    navKeyboard.push({
      text: `${page + 1}/${totalPages}`,
      callback_data: 'noop',
    });
    if (page < totalPages - 1) {
      navKeyboard.push({
        text: '→',
        callback_data: `get_keys:${page + 1}:${editable}`,
      });
    }
    keyboards.row(...navKeyboard);
    return { message, keyboards };
  }

  public async buyKey(ctx: Context, productId: string) {
    const user = await this.telegramService.handleCreateOrFindUser(ctx);
    if (!user) return;
    const product = await this.productService.getById(productId);
    if (!product) {
      return await ctx.reply('❌ К сожалению, данный продукт отсутствует.');
    }

    await ctx.conversation.enter('buy_key', { product, user });
  }

  public async extendKey(ctx: Context) {
    const user = await this.telegramService.handleCreateOrFindUser(ctx);
    if (!user) return;

    await ctx.conversation.enter('extend_key', { user });
  }
}
