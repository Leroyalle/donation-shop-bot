import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_CONFIG, PaymentConfig } from './types/payment-config.type';
import { Cart } from 'src/cart/entities/cart.entity';
import { CartItem } from 'src/cart-item/entities/cart-item.entity';
import { User } from 'src/user/entities/user.entity';
import axios from 'axios';
import { TinkoffWebhookData } from './types/payment-status.type';
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

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_CONFIG) private readonly paymentConfig: PaymentConfig,
    private readonly userService: UserService,
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
    private readonly cartItemService: CartItemService,
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

  async paymentStatusWebhook(data: TinkoffWebhookData) {
    const user = await this.userService.findById(data.DATA.userId);

    if (!user) return;

    const cart = await this.cartService.getUserCart(user.id);

    if (!cart) return;

    const cartItems = await this.cartItemService.findAllByCart(cart.id);

    if (cartItems.length === 0) return;

    if (data.Success) {
      const order = await this.orderService.update(cart.id, {
        status: 'CONFIRMED',
      });
      await this.cartService.clearCart(cart.id);

      return order;
    } else {
      const order = await this.orderService.update(cart.id, {
        status: 'REJECTED',
      });

      return order;
    }
  }
}
