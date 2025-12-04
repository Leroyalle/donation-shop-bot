import { Injectable } from '@nestjs/common';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { ConfigService } from '@nestjs/config';
import { Order } from 'src/domain/order/entities/order.entity';
import { CartItem } from 'src/domain/cart-item/entities/cart-item.entity';
import { OrderType } from 'src/domain/order/types/order-type.type';
import { Product } from 'src/domain/product/entities/product.entity';
import { orderTypeManager } from '../constants/order-type-manager.constant';
import path from 'path';

@Injectable()
export class PaymentNotificationsService {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly configService: ConfigService,
  ) {}

  private buildItemsString(items: CartItem[] | '') {
    return (
      items &&
      items
        .map(
          (item) =>
            `📌 <b>${item.card.name}</b> (${item.card.region}) — x${item.quantity}`,
        )
        .join('\n')
    );
  }

  private buildBuyKeyString(item: Product) {
    return `📌 <b>${item.name}</b> (${item.id})`;
  }

  private buildExtendKeyString({ extendKey }: { extendKey: string }) {
    return `📌 <b>Продлить ключ - ${extendKey}</b>`;
  }

  public async notifyAdminNewOrder(order: Order) {
    const adminChatId = this.configService.get<string>(
      'ADMIN_CHAT_NOTIFICATIONS',
    );
    if (!adminChatId) return;

    const username = order.user?.username?.trim();
    const name = order.user?.name?.trim();

    const displayUser = username
      ? username.startsWith('@')
        ? username
        : `@${username}`
      : name || 'Неизвестен';

    const parsedItems = JSON.parse(order.items);

    let filling = '';

    switch (order.type) {
      case 'STARS':
      case 'CARD': {
        filling = this.buildItemsString(parsedItems as CartItem[]);
        break;
      }
      case 'BUY_KEY': {
        filling = this.buildBuyKeyString(parsedItems as Product);
        break;
      }
      case 'EXTEND_KEY': {
        filling = this.buildExtendKeyString(
          parsedItems as { extendKey: string },
        );
        break;
      }

      default:
        filling = 'Автоматически выполнено поставщиком';
        break;
    }

    await this.bot.api.sendMessage(
      adminChatId,
      `
📦 <b>Новый заказ!</b>
🧾 <b>ID заказа:</b> <code>${order.id}</code>
👤 <b>Покупатель:</b> ${displayUser}
💰 <b>Сумма:</b> ${order.type === 'CARD' ? order.amount / 100 : order.amount} ₽
📋 <b>Тип:</b> ${orderTypeManager[order.type]}
${`🛫 <b>Отправить на:</b> email: ${order.email}${order.tgUsername ? `, tgUsername: ${order.tgUsername}` : ''}`}
🕒 <b>Дата:</b> ${new Date(order.createdAt).toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      })}
🛍️ <b>Содержимое заказа:</b>
    ${filling}
  `,
      { parse_mode: 'HTML' },
    );
  }

  public async notifyUserOrderPaid(order: Order) {
    try {
      if (!order.user?.telegramId) return;

      const notificationManager: Record<OrderType, string> = {
        CARD: `✅ <b>Платеж успешно выполнен!</b>
🧾 Заказ <b>#${order.id}</b>
💳 Сумма: <b>${order.amount / 100} ₽</b>
⏳ <i>Данные будут отправлены на вашу почту в течение 20 минут.</i>`,

        TOPUP: `✅ <b>Оплата прошла успешно!</b>
🧾 Заказ <b>#${order.id}</b>
💰 Пополнение аккаунта будет выполнено в ближайшее время!`,

        VOUCHER: `✅ <b>Оплата прошла успешно!</b>
🧾 Заказ <b>#${order.id}</b>
💰 Ссылка будет отправлена на вашу почту в ближайшее время! Не забудьте проверить папку СПАМ ❗`,

        STEAM: `✅ <b>Оплата прошла успешно!</b>
🧾 Заказ <b>#${order.id}</b>
🎮 Пополнение Steam-аккаунта будет выполнено в ближайшее время.`,

        BUY_KEY: `✅ <b>Оплата прошла успешно!</b>
🧾 Заказ <b>#${order.id}</b>
🗝️ Ключ будет выслан на вашу электронную почту в ближайшее время!`,

        EXTEND_KEY: `✅ <b>Оплата прошла успешно!</b>
🧾 Заказ <b>#${order.id}</b>
🗝️ Ключ будет продлен в ближайшее время! Спасибо что выбираете нас!`,

        STARS: `✅ <b>Оплата прошла успешно!</b>
🧾 Заказ <b>#${order.id}</b>
⭐ Ваш аккаунт будет пополнен в ближайшее время!`,
      };

      // await this.bot.api.sendMessage(
      //   order.user.telegramId,
      //   notificationManager[order.type],
      //   { parse_mode: 'HTML' },
      // );
      await this.bot.api.sendPhoto(
        order.user.telegramId,
        '/public/images/thx.jpg',
        {
          caption: notificationManager[order.type],
          parse_mode: 'HTML',
        },
      );
    } catch (error) {
      console.log('notifyUserOrderPaid', error);
    }
  }

  public async notifyUserError(telegramId: number) {
    await this.bot.api.sendMessage(
      telegramId,
      '❌ Произошла ошибка. Обратитесь в службу поддержки.',
    );
  }
}
