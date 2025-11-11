import { Injectable } from '@nestjs/common';
import { OrderService } from 'src/domain/order/order.service';
import { HttpClientService } from 'src/infrastructure/http-client/http-client.service';
import { Context, InlineKeyboard } from 'grammy';
import { Conversation } from '@grammyjs/conversations';
import { User } from 'src/domain/user/entities/user.entity';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/shared/constants/api-paths';
import { PaymentService } from 'src/domain/payment/services/payment.service';
import { ISteamCheckResult } from 'src/domain/payment/types/pay-digital/steam-check-result.type';
import { ITopupCheckRequest } from 'src/domain/payment/types/pay-digital/topup-check-request.type';
import { ITopupCheckResponse } from 'src/domain/payment/types/pay-digital/topup-check-response.type';

@Injectable()
export class PaymentConversationService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
    private readonly httpClientService: HttpClientService,
  ) {}

  public cartCheckoutConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    try {
      await ctx.reply(
        'Вы можете прервать диалог в любой момент, отправив /cancel.',
      );
      await ctx.reply('Введите email, на который отправить ссылку:');
      const email = await this.waitForText(conversation);
      if (!email) return await ctx.reply('Попробуйте ещё раз');
      await this.paymentService.paymentHandler(ctx, user, email);
    } catch (error) {
      console.log('[CART_CHECKOUT_CONV]', error);
      if (error.message === 'Conversation cancelled') return;
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };

  public steamPayConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    try {
      await ctx.reply(
        'Вы можете прервать диалог в любой момент, отправив /cancel.',
      );

      while (true) {
        await ctx.reply('Напишите имя вашего аккаунта STEAM:');
        const nickname = await this.waitForText(conversation);

        await ctx.reply('Повторите введённое ранее имя:');
        const repeatNick = await this.waitForText(conversation);

        if (!nickname || !repeatNick || nickname !== repeatNick) {
          await ctx.reply('Никнеймы не совпадают, попробуем ещё раз.');
          continue;
        }

        await ctx.reply('Введите сумму пополнения в рублях:');
        const amount = await this.waitForText(conversation);
        const parsedAmount = parseInt(amount || '', 10);

        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
          await ctx.reply(
            '❌ Введите корректное число больше 0. Диалог перезапускается.',
          );
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
      if (error.message === 'Conversation cancelled') return;
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };

  public buyTopupConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    try {
      await ctx.reply(
        'Вы можете прервать диалог в любой момент, отправив /cancel.',
      );
      const session = await conversation.external((ctx) => ctx.session);
      await ctx.reply('Введите email:');
      const email = await this.waitForText(conversation);

      await ctx.reply('Введите пароль:');
      const password = await this.waitForText(conversation);

      await ctx.reply('Введите ник в игре:');
      const nickname = await this.waitForText(conversation);

      const backupAnswer = await this.ask2FAStep(conversation, ctx);

      await ctx.reply(
        `✅ Email: ${email}\nПароль: ${password}\nНик: ${nickname}\n Backup code: ${backupAnswer.has2FA ? backupAnswer.backupCode : 'Нет'}\n\nВсе верно? Да/Нет`,
      );

      const confirmText = await this.waitForText(conversation);
      if (confirmText.toLowerCase() !== 'да') {
        await ctx.reply('Попробуйте ещё раз');
        session.topupData = null;
        return;
      }

      if (!session.topupData) return;

      const topupReqData: ITopupCheckRequest = {
        account: email,
        password,
        nickname,
        retail_price: session.topupData.retailPrice,
        backupcode: backupAnswer.has2FA ? backupAnswer.backupCode : undefined,
        region: 'Any',
        product_id: session.topupData.productId,
      };

      const res = await conversation.external(async () => {
        const { data } =
          await this.httpClientService.payDigitalInstance.post<ITopupCheckResponse>(
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
      if (error.message === 'Conversation cancelled') return;
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };

  public async ask2FAStep(
    conversation: Conversation,
    ctx: Context,
  ): Promise<{ has2FA: boolean; backupCode?: string }> {
    while (true) {
      await ctx.reply(
        'У вас включена двухфакторная аутентификация (2FA)?\n\nОтветьте: <b>Да</b> или <b>Нет</b>.',
        { parse_mode: 'HTML' },
      );

      const answer = (await this.waitForText(conversation)).toLowerCase();

      if (answer === 'да') {
        await ctx.reply(
          '🧩 Введите ваш <b>backup-код</b> — одноразовый код для входа',
          { parse_mode: 'HTML' },
        );
        const backupCode = await this.waitForText(conversation);
        return { has2FA: true, backupCode };
      }

      if (answer === 'нет') {
        return { has2FA: false };
      }

      await ctx.reply('⚠️ Пожалуйста, ответьте только “Да” или “Нет”.');
    }
  }

  private async waitForText(conversation: Conversation) {
    const msgCtx = await conversation.waitFor('message:text');
    const text = msgCtx.message.text.trim();

    if (text?.toLowerCase() === '/cancel' || text?.toLowerCase() === 'отмена') {
      await msgCtx.reply('❌ Диалог отменён.');
      throw new Error('Conversation cancelled');
    }

    return text;
  }
}
