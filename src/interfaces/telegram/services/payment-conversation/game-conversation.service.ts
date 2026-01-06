import { Injectable } from '@nestjs/common';
import { ConversationHelpersService } from './conversation-helpers.service';
import { Conversation } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import { User } from 'src/domain/user/entities/user.entity';
import { Product } from 'src/domain/product/entities/product.entity';
import { validateEmail } from './lib/validate-email.lib';
import { PaymentService } from 'src/domain/payment/services/payment.service';

@Injectable()
export class GameConversationService {
  constructor(
    private readonly conversationHelpersService: ConversationHelpersService,
    private readonly paymentService: PaymentService,
  ) {}

  public buyGameConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user, game }: { user: User; game: Product },
  ) => {
    try {
      await this.conversationHelpersService.cancelNotification(ctx);
      await ctx.reply('Введите ваш никнейм в Steam:');
      const nickname =
        await this.conversationHelpersService.waitForText(conversation);

      await ctx.reply('Повторите введенный ранее никнейм:');
      const nicknameRepeat =
        await this.conversationHelpersService.waitForText(conversation);

      if (nickname !== nicknameRepeat) {
        await ctx.reply('❌ Никнеймы не совпадают. Попробуйте ещё раз.');
        return;
      }

      await ctx.reply('Введите вашу электронную почту:');
      const email =
        await this.conversationHelpersService.waitForText(conversation);

      if (!validateEmail(email)) {
        await ctx.reply('❌ Некорректный e-mail. Попробуйте ещё раз.');
        return;
      }

      const stringifyGame = JSON.stringify(game);

      const paymentUrl = await this.paymentService.createIntellectMoneyInvoice(
        game.price,
        null,
        stringifyGame,
        email,
        user,
        'BUY_GAME',
        undefined,
        nickname,
      );

      if (!paymentUrl)
        return await ctx.reply('Не удалось создать платеж. Попробуйте ещё раз');

      await ctx.reply('Все готово. Осталось оплатить заказ 👇:', {
        reply_markup: new InlineKeyboard([
          [{ text: 'Оплатить', url: paymentUrl }],
        ]),
      });
    } catch (error) {
      console.log('BUY GAME ERROR, error', error);
    }
  };
}
