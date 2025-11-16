import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderService } from 'src/domain/order/order.service';
import { CartService } from 'src/domain/cart/cart.service';
import { CartItemService } from 'src/domain/cart-item/cart-item.service';
import { Order } from 'src/domain/order/entities/order.entity';
import { ICkassaPaymentWebhookData } from 'src/domain/payment/types/ckassa-payment-status.type';
import { IPayDigitalWebhookData } from 'src/domain/payment/types/pay-digital-webhook-data.type';
import { PaymentNotificationsService } from './payment-notification.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { createHash } from '../lib/create-hash';

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
    private readonly cartItemService: CartItemService,
    private readonly paymentNotificationsService: PaymentNotificationsService,
    private readonly configService: ConfigService,
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
    }
    return {
      user: order.user,
      state,
    };
  }

  public async payDigitalPaymentStatusWebhook(
    data: IPayDigitalWebhookData,
    res: Response,
  ) {
    try {
      const order = await this.orderService.findByPaymentId(data.order_uuid);

      if (!order) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ error: 'order_not_found' });
      }

      const result = this.validatePayDigitalWebhook(data, order);
      if (!result) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'invalid_signature' });
      }

      if (data.status === 'Paid') {
        await this.orderService.update(order.id, {
          status: 'CONFIRMED',
        });
        await this.paymentNotificationsService.notifyUserOrderPaid(order);
        await this.paymentNotificationsService.notifyAdminNewOrder(order);
      }

      return res.status(HttpStatus.OK).json({ status: 'ok' });
    } catch (error) {
      console.log('PAY_DIGITAL_WEBHOOK', error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ status: 'error' });
    }
  }

  private validatePayDigitalWebhook(
    data: IPayDigitalWebhookData,
    order: Order,
  ): boolean {
    let hash: string | null = null;

    if (order.type === 'TOPUP') {
      const secret = this.configService.get<string>('PAYDIGITAL_TOPUP');
      if (!secret) return false;
      hash = createHash(data.order_uuid, secret);
    }
    if (order.type === 'VOUCHER') {
      const secret = this.configService.get<string>('PAYDIGITAL_VOUCHER');
      if (!secret) return false;
      hash = createHash(data.order_uuid, secret);
    }
    if (order.type === 'STEAM') {
      const secret = this.configService.get<string>('PAYDIGITAL_STEAM');
      if (!secret) return false;
      hash = createHash(data.order_uuid, secret);
    }

    return hash === data.hash;
  }
}
