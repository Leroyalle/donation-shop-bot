import { Injectable } from '@nestjs/common';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { ConfigService } from '@nestjs/config';
import { Order } from 'src/domain/order/entities/order.entity';
import { CartItem } from 'src/domain/cart-item/entities/cart-item.entity';

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

    const parsedItems = order.items && (JSON.parse(order.items) as CartItem[]);

    const itemsString = this.buildItemsString(parsedItems);

    await this.bot.api.sendMessage(
      adminChatId,
      `
📦 <b>Новый заказ!</b>
🧾 <b>ID заказа:</b> <code>${order.id}</code>
👤 <b>Покупатель:</b> ${displayUser}
💰 <b>Сумма:</b> ${order.type === 'CARD' ? order.amount / 100 : order.amount} ₽
📋 <b>Тип:</b> ${order.type}
${order.type === 'CARD' ? `🛫 <b>Отправить на:</b> ${order.email}` : ''}
🕒 <b>Дата:</b> ${new Date(order.createdAt).toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      })}

🛍️ <b>Содержимое заказа:</b>
    ${order.type === 'CARD' ? itemsString : 'Автоматически выполнено поставщиком'}
  `,
      { parse_mode: 'HTML' },
    );
  }

  public async notifyUserOrderPaid(order: Order) {
    if (!order.user?.telegramId) return;

    const notificationManager: Record<string, string> = {
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
    };

    await this.bot.api.sendMessage(
      order.user.telegramId,
      notificationManager[order.type],
      { parse_mode: 'HTML' },
    );
  }

  public async notifyUserError(telegramId: number) {
    await this.bot.api.sendMessage(
      telegramId,
      '❌ Произошла ошибка. Обратитесь в службу поддержки.',
    );
  }
}
