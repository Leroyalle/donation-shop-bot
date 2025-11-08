import { Injectable } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { OrderService } from 'src/order/order.service';
import { HttpClientService } from 'src/http-client/http-client.service';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { InjectBot } from '@grammyjs/nestjs';
import { Conversation } from '@grammyjs/conversations';
import { User } from 'src/user/entities/user.entity';
import { ISteamCheckResult } from '../types/pay-digital/steam-check-result.type';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/common/constants/api-paths';
import { ITopupCheckRequest } from '../types/pay-digital/topup-check-request.type';
import { ITopupCheckResponse } from '../types/pay-digital/topup-check-response.type';
import { payDigitalInstance } from 'src/common/api/pay-digital-instance.api';

@Injectable()
export class PaymentConversationService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
    private readonly httpClientService: HttpClientService,
    @InjectBot() private readonly bot: Bot<Context>,
  ) {}

  public cartCheckoutConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    await ctx.reply('Введите email, на который отправить ссылку:');
    const emailCtx = await conversation.waitFor(':text');
    const email = emailCtx.message?.text?.trim();
    if (!email) return await ctx.reply('Попробуйте ещё раз');
    await this.paymentService.paymentHandler(ctx, user, email);
  };

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

        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
          await ctx.reply('❌ Введите корректное число больше 0.');
          continue;
        }

        await ctx.reply(`Поиск и создание платежа...`);

        const { data: checkResult } =
          await this.httpClientService.payDigitalInstance.post<ISteamCheckResult>(
            PAY_DIGITAL_PAYMENT_ENDPOINTS.steamCheck,
            { steamUsername: nickname },
          );

        if (!checkResult)
          return await ctx.reply('❌ Произошла ошибка. Аккаунт не найден.');

        const { data: payResult } =
          await this.httpClientService.payDigitalInstance.post<ISteamCheckResult>(
            PAY_DIGITAL_PAYMENT_ENDPOINTS.steamPay,
            {
              transactionId: checkResult.transactionId,
              net_amount: parsedAmount * 100,
            },
          );

        if (!payResult)
          return await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');

        await conversation.external(async () => {
          await this.orderService.create({
            user,
            amount: parsedAmount,
            paymentId: null,
            status: 'NEW',
            email: null,
            cart: null,
            items: '',
            type: 'STEAM',
          });
        });

        await ctx.reply('✅ Аккаунт найден и оплата создана!');
        break;
      }
    } catch (error) {
      console.log('[STEAM_PAY_CONV]', error);
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };

  public buyTopupConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    try {
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

      if (!session.topupData) return;

      const topupReqData: ITopupCheckRequest = {
        account: email,
        password,
        nickname,
        region: 'Any',
        product_id: session.topupData.productId,
      };

      const res = await conversation.external(async () => {
        const { data } = await payDigitalInstance.post<ITopupCheckResponse>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.topupCheck,
          topupReqData,
        );
        return data;
      });

      await conversation.external(async () => {
        await this.orderService.create({
          type: 'TOPUP',
          status: 'NEW',
          amount: res.retail_price_rub,
          email,
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
      console.log('[BUY_TOPUP_CONV]', error);
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };
}
