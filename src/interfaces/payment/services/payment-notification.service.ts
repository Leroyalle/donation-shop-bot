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
    const notificationManager = {
      CARD: `Заказ #${order.id} на сумму ${order.amount / 100} успешно оплачен.\n\nДанные будут отправлены на вашу электронную почту в течение 20 минут!`,
      TOPUP: `✅ Ваш заказ успешно оплачен! Аккаунт будет пополнен в ближайшее время!`,
      STEAM: `✅ Ваш заказ успешно оплачен! Аккаунт будет пополнен в ближайшее время!`,
    };
    await this.bot.api.sendMessage(
      order.user.telegramId,
      notificationManager[order.type],
    );
  }

  public async notifyUserError(telegramId: number) {
    await this.bot.api.sendMessage(
      telegramId,
      '❌ Произошла ошибка. Обратитесь в службу поддержки.',
    );
  }
}
