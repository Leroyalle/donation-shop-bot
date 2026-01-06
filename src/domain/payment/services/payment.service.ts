import { Injectable } from '@nestjs/common';
import { Cart } from 'src/domain/cart/entities/cart.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { CartService } from 'src/domain/cart/cart.service';
import { OrderService } from 'src/domain/order/order.service';
import { CartItemService } from 'src/domain/cart-item/cart-item.service';
import {
  CKASSA_PAYMENT_ENDPOINTS,
  INTELLECT_MONEY_PAYMENT_ENDPOINTS,
} from 'src/shared/constants/api-paths';
import { generateCkassaNumber } from '../lib/generate-ckassa-order-id.lib';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { HttpClientService } from 'src/infrastructure/http-client/http-client.service';
import {
  CreateInvoiceRequest,
  RecipientCurrency,
} from '../types/intellect-money-request.type';
import { ConfigService } from '@nestjs/config';
import { createIntellectMoneyHash } from '../lib/create-intellect-money-hash.lib';
import { IIntellectMoneyResponse } from '../types/intellect-money/intellect-money-response.type';
import { OrderType } from 'src/domain/order/types/order-type.type';

@Injectable()
export class PaymentService {
  constructor(
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
    private readonly cartItemService: CartItemService,
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly httpClientService: HttpClientService,
    private readonly configService: ConfigService,
  ) {}

  public async paymentHandler(
    ctx: Context,
    user: User,
    email: string,
    tgUsername: string | undefined,
  ) {
    try {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const cart = await this.cartService.getUserCart(user.id);

      if (!cart || cart.cartItems.length === 0)
        return ctx.answerCallbackQuery({
          text: 'Корзина пуста',
          show_alert: true,
        });

      const paymentUrl = await this.createIntellectMoneyPayment(
        cart,
        user,
        email,
        tgUsername,
      );

      if (!paymentUrl)
        return await ctx.reply('Не удалось создать платеж. Попробуйте еще раз');

      await ctx.reply('Все готово. Осталось оплатить заказ 👇:', {
        reply_markup: new InlineKeyboard([
          [{ text: 'Оплатить', url: paymentUrl.toString() }],
        ]),
      });
    } catch (error) {
      console.log('[paymentHandler]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async createIntellectMoneyInvoice(
    amount: number,
    cart: Cart | null,
    items: string,
    email: string,
    user: User,
    orderType: OrderType,
    tgUsername?: string,
    steamName?: string,
  ): Promise<string | undefined> {
    const order = await this.orderService.create({
      amount,
      cart,
      paymentId: null,
      items: items,
      email,
      user,
      status: 'NEW',
      type: orderType,
      tgUsername,
      steamName,
    });

    const shopId = this.configService.getOrThrow<number>(
      'INTELLECT_MONEY_SHOPID',
    );

    const hash = createIntellectMoneyHash(
      {
        Email: email,
        EshopId: Number(shopId),
        OrderId: order.id,
        RecipientAmount: String(amount),
        RecipientCurrency: RecipientCurrency.RUB,
        SignSecretKey: this.configService.getOrThrow<string>(
          'INTELLECT_MONEY_SECRET_KEY',
        ),
      },
      'md5',
    );

    const data: CreateInvoiceRequest = {
      Email: email,
      EshopId: Number(shopId),
      OrderId: order.id,
      RecipientCurrency: RecipientCurrency.RUB,
      RecipientAmount: String(amount),
      Hash: hash,
      // UserName: user.name,
    };

    const response =
      await this.httpClientService.intellectMoneyInstance.post<IIntellectMoneyResponse>(
        INTELLECT_MONEY_PAYMENT_ENDPOINTS.createInvoice,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

    console.log('response:', response, response.data.Result);

    if (response.data.Result.InvoiceId) {
      const paymentId = response.data.Result.InvoiceId.toString();
      // FIXME: мб устанавливать сразу + больше статусов Pay и тд
      await this.orderService.update(order.id, {
        paymentId,
      });
      const paymentUrl = `https://merchant.intellectmoney.ru/?InvoiceId=${response.data.Result.InvoiceId}`;
      return paymentUrl;
    }
  }

  public async createIntellectMoneyPayment(
    cart: Cart,
    user: User,
    email: string,
    tgUsername: string | undefined,
  ) {
    try {
      const amount = cart.cartItems.reduce((acc, item) => {
        return (acc += Number(item.card.price) * item.quantity);
      }, 0);

      const cartItems = await this.cartItemService.findAllByCart(cart.id);

      const paymentUrl = await this.createIntellectMoneyInvoice(
        amount,
        cart,
        JSON.stringify(cartItems),
        email,
        user,
        'CARD',
        tgUsername,
      );

      return paymentUrl;
    } catch (error) {
      console.log('createIntellectMoneyPayment', error);
      throw error;
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

      if (typeof response.data === 'string') {
        // FIXME: мб устанавливать сразу + больше статусов Pay и тд
        await this.orderService.update(order.id, { paymentId: ckassaOrderId });
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
