import { Conversation } from '@grammyjs/conversations';
import { Context } from 'grammy';

export async function buyTopupConversation(
  conversation: Conversation,
  ctx: Context,
) {
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
  if (confirmCtx.message.text.toLowerCase() !== 'да') {
    await ctx.reply('Попробуйте ещё раз');
  }
  await ctx.reply('Оплатить заказ по ссылке:');
}
