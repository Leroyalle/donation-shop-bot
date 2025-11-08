import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_CONFIG, PaymentConfig } from '../types/payment-config.type';
import { Cart } from 'src/domain/cart/entities/cart.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { CartService } from 'src/domain/cart/cart.service';
import { OrderService } from 'src/domain/order/order.service';
import { CartItemService } from 'src/domain/cart-item/cart-item.service';
import { CKASSA_PAYMENT_ENDPOINTS } from 'src/common/constants/api-paths';
import { generateCkassaNumber } from '../lib/generate-ckassa-order-id.lib';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { HttpClientService } from 'src/http-client/http-client.service';

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

  async createPayDigitalPayment() {}
}
