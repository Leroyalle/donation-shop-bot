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

  async notifyAdminNewOrder(order: Order) {
    const adminChatId = this.configService.get<string>(
      'ADMIN_CHAT_NOTIFICATIONS',
    );
    if (!adminChatId) return;

    await this.bot.api.sendMessage(
      adminChatId,
      `
📦 <b>Новый заказ!</b>
🧾 <b>ID заказа:</b> <code>${order.id}</code>
👤 <b>Покупатель:</b> ${order.user.name ?? 'Неизвестен'}
💰 <b>Сумма:</b> ${order.amount} ₽
📋 <b>Тип: ${order.type}</b>
${order.type === 'CARD' ? `🛫 <b>Отправить на: ${order.email}</b>` : ''}
🕒 <b>Дата:</b> ${new Date(order.createdAt).toLocaleString('ru-RU')}
      `,
      { parse_mode: 'HTML' },
    );
  }

  async notifyUserOrderPaid(order: Order) {
    await this.bot.api.sendMessage(
      order.user.telegramId,
      `Заказ #${order.id} на сумму ${order.amount} успешно оплачен.\n\nДанные будут отправлены на вашу электронную почту в течение 20 минут!`,
    );
  }
}
