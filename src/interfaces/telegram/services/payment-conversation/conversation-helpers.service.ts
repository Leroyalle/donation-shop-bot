import { Conversation } from '@grammyjs/conversations';
import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';

@Injectable()
export class ConversationHelpersService {
  public async waitForText(conversation: Conversation) {
    const msgCtx = await conversation.waitFor('message:text');
    const text = msgCtx.message.text.trim();

    if (text?.toLowerCase() === '/cancel' || text?.toLowerCase() === 'отмена') {
      await msgCtx.reply('❌ Диалог отменён.');
      throw new Error('Conversation cancelled');
    }

    return text;
  }

  public async cancelNotification(ctx: Context) {
    await ctx.reply(
      '‼️ Вы можете прервать диалог в любой момент, отправив /cancel.',
    );
  }
}
