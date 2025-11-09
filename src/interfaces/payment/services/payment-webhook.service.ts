import { Injectable } from '@nestjs/common';
import { OrderService } from 'src/domain/order/order.service';
import { CartService } from 'src/domain/cart/cart.service';
import { CartItemService } from 'src/domain/cart-item/cart-item.service';
import { Order } from 'src/domain/order/entities/order.entity';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { ICkassaPaymentWebhookData } from 'src/domain/payment/types/ckassa-payment-status.type';
import { IPayDigitalWebhookData } from 'src/domain/payment/types/pay-digital/pay-digital-webhook-data.type';

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
    private readonly cartItemService: CartItemService,
    @InjectBot() private readonly bot: Bot<Context>,
  ) {}

  async ckassaPaymentStatusWebhook(data: ICkassaPaymentWebhookData) {
    const order = await this.orderService.findByPaymentId(
      data.property.orderId,
    );

    if (!order || !order.cart || !order.user.id) return;

    const cartItems = await this.cartItemService.findAllByCart(order.cart.id);

    if (cartItems.length === 0) return;

    await this.resolveWebhook(order, data.state);
    await this.sendMessageToUser(order, data.state);
  }

  async resolveWebhook(
    order: Order,
    state: ICkassaPaymentWebhookData['state'],
  ) {
    if (!order.cart) return;
    if (state === 'PAYED') {
      await this.orderService.update(order.id, {
        status: 'CONFIRMED',
      });
      await this.cartService.clearCart(order.cart.id);
    }
    return {
      user: order.user,
      state,
    };
  }

  public async payDigitalPaymentStatusWebhook(data: IPayDigitalWebhookData) {
    const order = await this.orderService.findByPaymentId(data.order_id);

    if (!order) return;

    if (data.status === 'Paid') {
      await this.orderService.update(order.id, {
        status: 'CONFIRMED',
        paymentId: data.order_uuid,
      });
      await this.bot.api.sendMessage(
        order.user.telegramId,
        `✅ Ваш заказ успешно оплачен! Аккаунт будет пополнен в ближайшее время!`,
      );
    }
  }

  async sendMessageToUser(
    order: Order,
    state: ICkassaPaymentWebhookData['state'],
  ) {
    if (state === 'PAYED') {
      await this.bot.api.sendMessage(
        order.user.telegramId,
        'Заказ #' +
          order.id +
          ' на сумму ' +
          order.amount +
          ' успешно оплачен \n\nДанные будут отправлены на вашу электронную почту в течении 20 минут!',
        // TODO: высылать заказ
      );
    }
  }
}
