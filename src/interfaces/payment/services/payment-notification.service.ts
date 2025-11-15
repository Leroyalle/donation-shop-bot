import { Injectable } from '@nestjs/common';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { ConfigService } from '@nestjs/config';
import { Order } from 'src/domain/order/entities/order.entity';

@Injectable()
export class PaymentNotificationsService {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly configService: ConfigService,
  ) {}

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

    await this.bot.api.sendMessage(
      adminChatId,
      `
📦 <b>Новый заказ!</b>
🧾 <b>ID заказа:</b> <code>${order.id}</code>
👤 <b>Покупатель:</b> ${displayUser}
💰 <b>Сумма:</b> ${order.type === 'CARD' ? order.amount / 100 : order.amount} ₽
📋 <b>Тип: ${order.type}</b>
${order.type === 'CARD' ? `🛫 <b>Отправить на: ${order.email}</b>` : ''}
🕒 <b>Дата:</b> ${new Date(order.createdAt).toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      })}
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
💰 Ссылка будет отправлена на вашу почту в ближайшее время!`,

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
