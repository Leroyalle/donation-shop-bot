import { Conversation } from '@grammyjs/conversations';
import { Context } from 'grammy';
import { payDigitalInstance } from 'src/common/api/pay-digital-instance.api';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/common/constants/api-paths';
import { ISteamCheckResult } from 'src/payment/types/pay-digital/steam-check-result.type';

export const steamPayConversation = async (
  conversation: Conversation,
  ctx: Context,
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

      await ctx.reply(`Отлично, ${nickname}!`);
      // const checkResult = await conversation.external(async () => {
      const { data: checkResult } =
        await payDigitalInstance.post<ISteamCheckResult>(
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
      const { data } = await payDigitalInstance.post<ISteamCheckResult>(
        PAY_DIGITAL_PAYMENT_ENDPOINTS.steamPay,
        {
          transactionId: checkResult.transactionId,
          net_amount: parsedAmount * 100,
        },
      );

      console.log('steamPay', data);

      // return data;
      // });
      const payResult = data;

      if (!payResult)
        return await ctx.reply('❌ Произошла ошибка. Аккаунт не найден.');

      console.log('PAY RESULT', payResult);
      await ctx.reply('✅ Аккаунт нашелся!');

      break;
    }
  } catch (error) {
    console.log('[STEAM_PAY_CONV]', error);
    await ctx.reply('❌ Произошла ошибка. Попробуйте еще раз!');
  }
};
