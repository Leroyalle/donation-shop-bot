import { Conversation } from '@grammyjs/conversations';
import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { ConversationHelpersService } from './conversation-helpers.service';
import { validateEmail } from './lib/validate-email.lib';
import { Product } from 'src/domain/product/entities/product.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { PaymentService } from 'src/domain/payment/services/payment.service';
import { ProductService } from 'src/domain/product/product.service';
import { ProductType } from 'src/domain/product/types/product-type.enum';

@Injectable()
export class KeysPaymentConversationsService {
  constructor(
    private readonly conversationHelpersService: ConversationHelpersService,
    private readonly paymentService: PaymentService,
    private readonly productService: ProductService,
  ) {}

  public buyKeyConversation = async (
    conversation: Conversation,
    ctx: Context,
    { product, user }: { product: Product; user: User },
  ) => {
    await this.conversationHelpersService.cancelNotification(ctx);
    await ctx.reply('Введите ваш EMAIL:');
    const email =
      await this.conversationHelpersService.waitForText(conversation);

    if (!validateEmail(email)) {
      await ctx.reply('❌ Некорректный e-mail. Попробуйте ещё раз.');
      return;
    }

    const paymentUrl = await this.paymentService.createIntellectMoneyInvoice(
      product.price,
      null,
      JSON.stringify(product),
      email,
      user,
      'BUY_KEY',
    );

    if (!paymentUrl) {
      await ctx.reply('❌ Не удалось создать платеж. Попробуйте ещё раз.');
      return;
    }

    await ctx.reply(`Все готово. Осталось оплатить заказ 👇:`, {
      reply_markup: new InlineKeyboard([
        [{ text: 'Оплатить', url: paymentUrl }],
      ]),
    });
  };

  public extendKeyConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    await this.conversationHelpersService.cancelNotification(ctx);
    await ctx.reply('Введите ваш EMAIL:');
    const email =
      await this.conversationHelpersService.waitForText(conversation);

    if (!validateEmail(email)) {
      await ctx.reply('❌ Некорректный e-mail. Попробуйте ещё раз.');
      return;
    }

    await ctx.reply('Отправьте ключ который хотите продлить:');
    const key = await this.conversationHelpersService.waitForText(conversation);
    await ctx.reply('Повторите введенный ключ:');
    const repeatedKey =
      await this.conversationHelpersService.waitForText(conversation);

    if (key.trim() !== repeatedKey.trim()) {
      await ctx.reply('❌ Ключи не совпадают. Попробуйте ещё раз.');
      return;
    }

    const productKey = await this.productService.getFirstByType(
      ProductType.KEY,
    );

    if (!productKey) {
      await ctx.reply('😟 Этих товаров пока нет! Попробуйте позже.');
      return;
    }

    const paymentUrl = await this.paymentService.createIntellectMoneyInvoice(
      productKey.price,
      null,
      JSON.stringify({
        extendKey: key,
      }),
      email,
      user,
      'EXTEND_KEY',
    );

    if (!paymentUrl) {
      await ctx.reply('❌ Не удалось создать платеж. Попробуйте ещё раз.');
      return;
    }

    await ctx.reply(`✔️ Все готово! Осталось оплатить продление 👇:`, {
      reply_markup: new InlineKeyboard([
        [{ text: 'Оплатить', url: paymentUrl }],
      ]),
    });
  };
}
