import { Injectable } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { Card } from 'src/domain/card/entities/card.entity';
import { Region } from 'src/domain/card/types/region.enum';
import { CartItem } from 'src/domain/cart-item/entities/cart-item.entity';
import { appleRegionTranslater } from '../constants/apple-regions-translater.constants';

@Injectable()
export class UiBuilderService {
  public buildCardCatalogKeyboard(
    card: Card,
    page: number,
    totalItems: number,
    region: Region,
    perPage: number = 1,
  ) {
    const message = `<b>${card.name}</b>\n${card.description}`;
    const keyboards = new InlineKeyboard().row({
      text: `Добавить в корзину - ${card.price} ₽`,
      callback_data: `addToCart:${card.id}:${page}`,
    });

    const totalPages = Math.ceil(totalItems / perPage);

    const navKeyboard: { text: string; callback_data: string }[] = [];
    if (page > 0) {
      navKeyboard.push({
        text: '←',
        callback_data: `catalog:${page - 1}:${region}`,
      });
    }
    navKeyboard.push({
      text: `${page + 1}/${totalPages}`,
      callback_data: 'noop',
    });
    if (page < totalPages - 1) {
      navKeyboard.push({
        text: '→',
        callback_data: `catalog:${page + 1}:${region}`,
      });
    }
    keyboards.row(...navKeyboard);
    return { message, keyboards };
  }

  public buildCartItemKeyboard(
    cartItem: CartItem,
    page: number,
    totalPages: number,
    amount: number,
  ) {
    const message = `<b>${cartItem.card.name}</b>\n${cartItem.card.description}`;
    const keyboards = new InlineKeyboard()
      .text(
        `${cartItem.quantity} шт - ${cartItem.card.price * cartItem.quantity} ₽`,
        'noop',
      )
      .row()
      .text('+', `increment:${cartItem.id}:${page}`)
      .text('Удалить', `deleteFromCart:${cartItem.id}:${page}`)
      .text('-', `decrement:${cartItem.id}:${page}`)
      .row()
      .text(`✅ Заказ на ${amount} ₽ Оформить?`, 'checkout')
      .row()
      .text('🛒 Продолжить покупки', 'apple_cards');

    const navKeyboard: { text: string; callback_data: string }[] = [];
    if (page > 0)
      navKeyboard.push({ text: '←', callback_data: `cartPage:${page - 1}` });
    navKeyboard.push({
      text: `${page + 1}/${totalPages}`,
      callback_data: 'noop',
    });
    if (page < totalPages - 1)
      navKeyboard.push({ text: '→', callback_data: `cartPage:${page + 1}` });
    keyboards.row(...navKeyboard);

    console.log('after reply');

    return { message, keyboards };
  }

  public buildCardsRegionsList(regions: typeof Region) {
    const keyboard = new InlineKeyboard();

    Object.values(regions).map((r) => {
      keyboard.row({
        text: appleRegionTranslater[r],
        callback_data: `catalog:0:${r}:false`,
      });
    });

    return keyboard;
  }
}
