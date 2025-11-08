import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_CONFIG, PaymentConfig } from '../types/payment-config.type';
import { Cart } from 'src/cart/entities/cart.entity';
import { User } from 'src/user/entities/user.entity';
import { ICkassaPaymentWebhookData } from '../types/ckassa-payment-status.type';
import { CartService } from 'src/cart/cart.service';
import { OrderService } from 'src/order/order.service';
import { CartItemService } from 'src/cart-item/cart-item.service';
import { CKASSA_PAYMENT_ENDPOINTS } from 'src/common/constants/api-paths';
import { generateCkassaNumber } from '../lib/generate-ckassa-order-id.lib';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { Order } from 'src/order/entities/order.entity';
import { HttpClientService } from 'src/http-client/http-client.service';

import { IPayDigitalWebhookData } from '../types/pay-digital/pay-digital-webhook-data.type';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_CONFIG) private readonly paymentConfig: PaymentConfig,
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
    private readonly cartItemService: CartItemService,
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly httpClientService: HttpClientService,
  ) {}

  onModuleInit() {
    console.log('PAYMENT CONF', this.paymentConfig);
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

  public async paymentHandler(ctx: Context, user: User, email: string) {
    try {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const cart = await this.cartService.getUserCart(user.id);
      await ctx.answerCallbackQuery();

      if (!cart || cart.cartItems.length === 0)
        return ctx.answerCallbackQuery({
          text: 'Корзина пуста',
          show_alert: true,
        });

      const paymentUrl = await this.createCkassaPayment(cart, user, email);
      if (!paymentUrl)
        return await ctx.reply('Не удалось создать платеж. Попробуйте еще раз');

      await ctx.reply('Оплатить заказ по ссылке:', {
        reply_markup: new InlineKeyboard([
          [{ text: 'Оплатить', url: paymentUrl }],
        ]),
      });
    } catch (error) {
      console.log('[paymentHandler]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  async createCkassaPayment(cart: Cart, user: User, email: string) {
    try {
      const amount = cart.cartItems.reduce((acc, item) => {
        return (acc += Number(item.card.price) * item.quantity * 100);
      }, 0);

      const cartItems = await this.cartItemService.findAllByCart(cart.id);

      const order = await this.orderService.create({
        amount,
        cart,
        paymentId: null,
        items: JSON.stringify(cartItems),
        email,
        user,
        status: 'NEW',
        type: 'CARD',
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

      // const response = await axios.post<string>(
      //   CKASSA_PAYMENT_ENDPOINTS.invoice,
      //   data,
      //   {
      //     headers: {
      //       'Content-Type': 'application/json',
      //       ApiLoginAuthorization: this.paymentConfig.loginKey,
      //       ApiAuthorization: this.paymentConfig.secretKey,
      //     },
      //   },
      // );

      const response = await this.httpClientService.ckassaInstance.post(
        CKASSA_PAYMENT_ENDPOINTS.invoice,
        data,
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

  async createPayDigitalPayment() {}

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
