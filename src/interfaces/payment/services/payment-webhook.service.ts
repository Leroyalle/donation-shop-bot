import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderService } from 'src/domain/order/order.service';
import { CartService } from 'src/domain/cart/cart.service';
import { CartItemService } from 'src/domain/cart-item/cart-item.service';
import { Order } from 'src/domain/order/entities/order.entity';
import { ICkassaPaymentWebhookData } from 'src/domain/payment/types/ckassa-payment-status.type';
import { IPayDigitalWebhookData } from 'src/domain/payment/types/pay-digital-webhook-data.type';
import { PaymentNotificationsService } from './payment-notification.service';
import { Response } from 'express';

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
    private readonly cartItemService: CartItemService,
    private readonly paymentNotificationsService: PaymentNotificationsService,
  ) {}

  async ckassaPaymentStatusWebhook(
    data: ICkassaPaymentWebhookData,
    res: Response,
  ) {
    try {
      const orderId = data.property?.['НОМЕР ЗАКАЗА'] as string;
      if (!orderId) {
        console.warn('⚠️ Нет orderId в property');
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'missing_order_id' });
      }

      if (data.state === 'REFUNDED') {
        console.log(
          '🔙 [CKASSA_WEBHOOK_PROCESSED] Сделан возврат paymentId:',
          orderId,
        );
        return res.status(HttpStatus.OK).json({ status: 'ok' });
      }

      const order = await this.orderService.findByPaymentId(orderId);
      console.log('CKASSA_WEBHOOK finded order', order);

      if (!order || !order.cart || !order.user.id) {
        console.warn(
          '⚠️ Заказ или корзина и юзер в нем не найден по paymentId',
          orderId,
        );
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ status: 'order_not_found' });
      }

      const cartItems = await this.cartItemService.findAllByCart(order.cart.id);

      if (cartItems.length === 0) {
        console.warn('⚠️ Пустая корзина у заказа', order.id);
        return res.status(HttpStatus.OK).json({ status: 'empty_cart' });
      }

      await this.resolveCkassaWebhook(order, data.state);

      if (data.state === 'PAYED') {
        await this.paymentNotificationsService.notifyUserOrderPaid(order);
        await this.paymentNotificationsService.notifyAdminNewOrder(order);
        console.log(
          '✅ [CKASSA_WEBHOOK_PROCESSED] Заказ подтверждён:',
          order.id,
        );
        return res.status(HttpStatus.OK).json({ status: 'ok' });
      }
    } catch (error) {
      console.log('CKASSA_PAYMENT_WEBHOOK', error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ status: 'error' });
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
      await this.cartService.clearCart(order.user.id);
      console.log('[RESOLVE_CKASSA_WEBHOOK after order update');
    }
    return {
      user: order.user,
      state,
    };
  }

  public async payDigitalPaymentStatusWebhook(data: IPayDigitalWebhookData) {
    try {
      const order = await this.orderService.findById(data.order_id);

      console.log('payDigitalPaymentStatusWebhook order', order);

      if (!order) return;

      if (data.status === 'Paid') {
        await this.orderService.update(order.id, {
          status: 'CONFIRMED',
          // paymentId: data.order_uuid,
        });
        await this.paymentNotificationsService.notifyUserOrderPaid(order);
        await this.paymentNotificationsService.notifyAdminNewOrder(order);
      }
    } catch (error) {
      console.log('PAY_DIGITAL_WEBHOOK', error);
    }
  }
}
