import { Injectable } from '@nestjs/common';
import { OrderService } from 'src/domain/order/order.service';
import { CartService } from 'src/domain/cart/cart.service';
import { CartItemService } from 'src/domain/cart-item/cart-item.service';
import { Order } from 'src/domain/order/entities/order.entity';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { ICkassaPaymentWebhookData } from 'src/domain/payment/types/ckassa-payment-status.type';
import { IPayDigitalWebhookData } from 'src/domain/payment/types/pay-digital/pay-digital-webhook-data.type';
import { PaymentNotificationsService } from './payment-notification.service';

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
    private readonly cartItemService: CartItemService,
    private readonly paymentNotificationsService: PaymentNotificationsService,
    @InjectBot() private readonly bot: Bot<Context>,
  ) {}

  async ckassaPaymentStatusWebhook(data: ICkassaPaymentWebhookData) {
    try {
      const order = await this.orderService.findByPaymentId(
        data.property.orderId,
      );

      console.log('CKASSA_WEBHOOK finded order', order);
      if (!order || !order.cart || !order.user.id) return;

      const cartItems = await this.cartItemService.findAllByCart(order.cart.id);

      if (cartItems.length === 0) return;

      await this.resolveCkassaWebhook(order, data.state);
      await this.sendMessageToUser(order, data.state);

      await this.paymentNotificationsService.notifyAdminNewOrder(order);
      console.log('CKASSA_WEBHOOK after user and adming notify');
    } catch (error) {
      console.log('CKASSA_PAYMENT_WEBHOOK', error);
    }
  }

  async resolveCkassaWebhook(
    order: Order,
    state: ICkassaPaymentWebhookData['state'],
  ) {
    if (!order.cart) return;
    if (state === 'PAYED') {
      await this.orderService.update(order.id, {
        status: 'CONFIRMED',
      });
      await this.cartService.clearCart(order.cart.id);
      console.log('[RESOLVE_CKASSA_WEBHOOK after order update');
    }
    return {
      user: order.user,
      state,
    };
  }

  public async payDigitalPaymentStatusWebhook(data: IPayDigitalWebhookData) {
    try {
      const order = await this.orderService.findByPaymentId(data.order_id);

      if (!order) return;

      if (data.status === 'Paid') {
        await this.orderService.update(order.id, {
          status: 'CONFIRMED',
          paymentId: data.order_uuid,
        });
        await this.paymentNotificationsService.notifyUserOrderPaid(order);
        await this.paymentNotificationsService.notifyAdminNewOrder(order);
      }
    } catch (error) {
      console.log('PAY_DIGITAL_WEBHOOK', error);
    }
  }

  async sendMessageToUser(
    order: Order,
    state: ICkassaPaymentWebhookData['state'],
  ) {
    if (state === 'PAYED') {
      await this.paymentNotificationsService.notifyUserOrderPaid(order);
    }
  }
}
