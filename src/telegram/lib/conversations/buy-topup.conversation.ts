import { Conversation } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import { ITopupCheckRequest } from 'src/payment/types/pay-digital/topup-check-request.type';
import { payDigitalInstance } from 'src/common/api/pay-digital-instance.api';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/common/constants/api-paths';
import { ITopupCheckResponse } from 'src/payment/types/pay-digital/topup-check-response.type';

export async function buyTopupConversation(
  conversation: Conversation,
  ctx: Context,
) {
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
    const keyboard = new InlineKeyboard();
    keyboard.url('Перейти к оплате', res.sbp_url);
    await ctx.reply(`Ссылка на оплату ${res.product}:`, {
      reply_markup: keyboard,
    });
  } catch (error) {
    console.log('[BUY_POPUP_CONV]', error);
    await ctx.reply('❌ Произошла ошибка. Попробуйте ещё раз');
  }
}
