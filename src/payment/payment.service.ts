import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_CONFIG, PaymentConfig } from './types/payment-config.type';
import { Cart } from 'src/cart/entities/cart.entity';
import { User } from 'src/user/entities/user.entity';
import { ICkassaPaymentWebhookData } from './types/ckassa-payment-status.type';
import { CartService } from 'src/cart/cart.service';
import { OrderService } from 'src/order/order.service';
import { CartItemService } from 'src/cart-item/cart-item.service';
import {
  CKASSA_PAYMENT_ENDPOINTS,
  PAY_DIGITAL_PAYMENT_ENDPOINTS,
} from 'src/common/constants/api-paths';
import { generateCkassaNumber } from './lib/generate-ckassa-order-id.lib';
import { InjectBot } from '@grammyjs/nestjs';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { Order } from 'src/order/entities/order.entity';
import { HttpClientService } from 'src/http-client/http-client.service';
import { Conversation } from '@grammyjs/conversations';
import { ITopupCheckRequest } from './types/pay-digital/topup-check-request.type';
import { payDigitalInstance } from 'src/common/api/pay-digital-instance.api';
import { ITopupCheckResponse } from './types/pay-digital/topup-check-response.type';
import { IPayDigitalWebhookData } from './types/pay-digital/pay-digital-webhook-data.type';
import { ISteamCheckResult } from './types/pay-digital/steam-check-result.type';

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

  public steamPayConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    try {
      const session = await conversation.external((ctx) => ctx.session);

      while (true) {
        await ctx.reply('Напишите имя вашего аккаунта STEAM:');
        const nicknameCtx = await conversation.waitFor(':text');
        const nickname = nicknameCtx.message?.text?.trim();

        await ctx.reply('Повторите введённое ранее имя:');
        const repeatNickCtx = await conversation.waitFor(':text');
        const repeatNick = repeatNickCtx.message?.text?.trim();

        if (!nickname || !repeatNick || nickname !== repeatNick) {
          await ctx.reply('Никнеймы не совпадают, попробуем ещё раз.');
          continue;
        }

        await ctx.reply('Введите сумму пополнения в рублях:');
        const amountCtx = await conversation.waitFor(':text');
        const amount = amountCtx.message?.text?.trim();
        const parsedAmount = parseInt(amount || '', 10);

        if (!amount || isNaN(parsedAmount)) {
          await ctx.reply('❌ Введите корректное число.');
          continue;
        }

        if (parseInt(amount, 10) <= 0) {
          await ctx.reply('❌ Сумма должна быть больше 0.');
          continue;
        }

        await ctx.reply(`Поиск и создание платежа...`);
        // const checkResult = await conversation.external(async () => {
        // const { data: checkResult } =
        //   await payDigitalInstance.post<ISteamCheckResult>(
        //     PAY_DIGITAL_PAYMENT_ENDPOINTS.steamCheck,
        //     {
        //       steamUsername: nickname,
        //     },
        //   );

        const { data: checkResult } =
          await this.httpClientService.payDigitalInstance.post<ISteamCheckResult>(
            PAY_DIGITAL_PAYMENT_ENDPOINTS.steamCheck,
            {
              steamUsername: nickname,
            },
          );

        console.log('steamCheck', checkResult);

        // return data;
        // });

        if (!checkResult)
          return await ctx.reply('❌ Произошла ошибка. Аккаунт не найден.');

        // const payResult = await conversation.external(async () => {
        // const { data } = await payDigitalInstance.post<ISteamCheckResult>(
        //   PAY_DIGITAL_PAYMENT_ENDPOINTS.steamPay,
        //   {
        //     transactionId: checkResult.transactionId,
        //     net_amount: parsedAmount * 100,
        //   },
        // );

        const { data: payResult } =
          await this.httpClientService.payDigitalInstance.post<ISteamCheckResult>(
            PAY_DIGITAL_PAYMENT_ENDPOINTS.steamPay,
            {
              transactionId: checkResult.transactionId,
              net_amount: parsedAmount * 100,
            },
          );

        console.log('PAY RESULT', payResult);

        if (!payResult)
          return await ctx.reply('❌ Произошла ошибка. Аккаунт не найден.');

        await conversation.external(async () => {
          await this.orderService.create({
            user,
            amount: parsedAmount,
            paymentId: payResult.transactionId,
            status: 'NEW',
            email: null,
            cart: null,
            items: '',
            type: 'STEAM',
          });
        });
        await ctx.reply('✅ Аккаунт нашелся!');

        break;
      }
    } catch (error) {
      console.log('[STEAM_PAY_CONV]', error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте еще раз!');
    }
  };

  public buyTopupConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    try {
      console.log('user', user);
      const session = await conversation.external((ctx) => ctx.session);
      await ctx.reply('Введите email:');
      const emailCtx = await conversation.waitFor('message:text');
      const email = emailCtx.message.text.trim();

      await ctx.reply('Введите пароль:');
      const passCtx = await conversation.waitFor('message:text');
      const password = passCtx.message.text.trim();

      await ctx.reply('Введите ник в игре:');
      const nickCtx = await conversation.waitFor('message:text');
      const nickname = nickCtx.message.text.trim();

      await ctx.reply(
        `✅ Email: ${email}\nПароль: ${password}\nНик: ${nickname}\n\nВсе верно? Да/Нет`,
      );

      const confirmCtx = await conversation.waitFor('message:text');
      if (confirmCtx.message.text.toLowerCase() === 'нет') {
        await ctx.reply('Попробуйте ещё раз');
        session.topupData = null;
        return;
      }

      console.log('SESSON', session);

      if (!session.topupData) return;

      const topupReqData: ITopupCheckRequest = {
        account: email,
        password,
        nickname,
        region: 'Any',
        product_id: session.topupData.productId,
      };

      if (!ctx.chat?.id) return;
      console.log(process.env.PAYDIGITAL_TOKEN);
      const res = await conversation.external(async () => {
        const { data } = await payDigitalInstance.post<ITopupCheckResponse>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.topupCheck,
          topupReqData,
        );
        return data;
      });

      console.log('res', res);
      await conversation.external(async () => {
        await this.orderService.create({
          type: 'TOPUP',
          status: 'NEW',
          amount: res.retail_price_rub,
          email: email,
          paymentId: res.sbp_uuid,
          user,
          items: '',
          cart: null,
        });
      });
      const keyboard = new InlineKeyboard();
      keyboard.url('Перейти к оплате', res.sbp_url);
      await ctx.reply(`Ссылка на оплату ${res.product}:`, {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.log('[BUY_POPUP_CONV]', error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте ещё раз');
    }
  };

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
