import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_CONFIG, PaymentConfig } from './types/payment-config.type';
import { Cart } from 'src/cart/entities/cart.entity';
import { CartItem } from 'src/cart-item/entities/cart-item.entity';
import { User } from 'src/user/entities/user.entity';
import axios from 'axios';
import { PaymentWebhookData } from './types/payment-status.type';
import { UserService } from 'src/user/user.service';
import { CartService } from 'src/cart/cart.service';
import { OrderService } from 'src/order/order.service';
import { CartItemService } from 'src/cart-item/cart-item.service';
import { PaymentResponse } from './types/created-payment.type';
// import crypto from 'crypto';
import { PaymentRequest } from './types/payment-request-data.type';
import { generatePaymentToken } from './lib/generate-payment-token.lib';
import { PAYMENT_ENDPOINTS } from 'src/common/constants/api-paths';
import { generateCkassaNumber } from './lib/generate-ckassa-order-id.lib';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { Order } from 'src/order/entities/order.entity';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_CONFIG) private readonly paymentConfig: PaymentConfig,
    private readonly userService: UserService,
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
    private readonly cartItemService: CartItemService,
    @InjectBot() private readonly bot: Bot<Context>,
  ) {}
  onModuleInit() {
    console.log('PAYMENT CONF', this.paymentConfig);
  }

  async createPayment(cart: Cart, user: User) {
    try {
      const amount = cart.cartItems.reduce((acc, item) => {
        return (acc += Number(item.card.price) * item.quantity * 100);
      }, 0);

      // const dataWithToken = generatePaymentToken(
      //   data,
      //   this.paymentConfig.secretKey,
      // );
      const cartItems = await this.cartItemService.findAllByCart(cart.id);

      const order = await this.orderService.create({
        amount,
        cart,
        paymentId: null,
        items: JSON.stringify(cartItems),
        user,
        status: 'NEW',
      });

      const ckassaOrderId = generateCkassaNumber(order);

      const data = {
        servCode: '111-19658-2',
        tgInvPayer: user.telegramId,
        amount,
        nodeName: 'ACQ4I',
        invType: 'READ_ONLY',
        startPaySelect: true,
        properties: [ckassaOrderId],
      };

      if (cartItems.length === 0) return;

      const response = await axios.post<string>(
        PAYMENT_ENDPOINTS.invoice,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            ApiLoginAuthorization: this.paymentConfig.loginKey,
            ApiAuthorization: this.paymentConfig.secretKey,
          },
        },
      );

      console.log('payRes', response);
      const paymentId = response.data.split('/').pop();
      if (paymentId && typeof response.data === 'string') {
        await this.orderService.update(order.id, { paymentId });
      }

      if (response.data) {
        return response.data;
      } else {
        throw new Error('Ошибка при создании платежа');
      }
    } catch (error) {
      console.log(error);
      return;
    }
  }

  async paymentStatusWebhook(data: PaymentWebhookData) {
    // const user = await this.userService.findById(data.DATA.userId);
    const order = await this.orderService.findById(data.property.orderId);

    if (!order || !order.cart || !order.user.id) return;

    // const cart = await this.cartService.getUserCart(order.cart.id);

    const cartItems = await this.cartItemService.findAllByCart(order.cart.id);

    if (cartItems.length === 0) return;

    const result = await this.resolveWebhook(order, data.state);

    if (result.state === 'SUCCESS') {
      await this.bot.api.sendMessage(
        order.user.telegramId,
        'Заказ #' + order.id + ' успешно оплачен',
        // TODO: высылать заказ
      );
    } else if (result.state === 'REJECTED') {
      await this.bot.api.sendMessage(
        order.user.telegramId,
        'Заказ #' + order.id + ' отклонен',
        // TODO: высылать заказ
      );
    }
  }

  async resolveWebhook(order: Order, state: string) {
    if (state === 'SUCCESS') {
      await this.orderService.update(order.cart.id, {
        status: 'CONFIRMED',
      });
      await this.cartService.clearCart(order.cart.id);
    } else {
      await this.orderService.update(order.cart.id, {
        status: 'REJECTED',
      });
    }
    return {
      user: order.user,
      state,
    };
  }
}
