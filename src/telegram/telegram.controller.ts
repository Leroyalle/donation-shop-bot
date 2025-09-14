import { Injectable } from '@nestjs/common';
import { Command, InjectBot, Start, Update } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';

interface Product {
  name: string;
  price: string;
  description?: string;
}

const products: Product[] = [
  {
    name: 'Sword of Power',
    price: '100💎',
    description: 'Epic sword with +10 attack',
  },
  { name: 'Healing Potion', price: '20💎', description: 'Restores 50 HP' },
];

@Update()
@Injectable()
export class TelegramController {
  constructor(@InjectBot() private readonly bot: Bot<Context>) {}

  onModuleInit() {
    console.log('TelegramService initialized, bot is ready');
  }

  @Start()
  async onStart(ctx: Context) {
    console.log('bot received /start');

    let message = 'Welcome! Here are some products:\n\n';
    products.forEach((p, i) => {
      message += `${i + 1}. ${p.name} — ${p.price}\n${p.description ?? ''}\n\n`;
    });

    await ctx.reply(message);
    await ctx.reply('Type /buy <number> to purchase a product.');
  }

  @Command('buy')
  async onBuy(ctx: Context) {
    const text = ctx.message?.text || '';
    const parts = text.split(' ');

    if (parts.length < 2) {
      return ctx.reply('Please provide a product number, e.g. /buy 1');
    }

    const index = parseInt(parts[1], 10) - 1;
    if (isNaN(index) || index < 0 || index >= products.length) {
      return ctx.reply('Invalid product number.');
    }

    const product = products[index];
    await ctx.reply(`You bought: ${product.name} for ${product.price}! 🎉`);
  }
}
