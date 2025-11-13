import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context } from 'grammy';

@Injectable()
export class SupportService {
  constructor(private readonly configService: ConfigService) {}

  public async sendSupportReply(ctx: Context) {
    const username = this.configService.get<string>('SUPPORT_USERNAME') || '';
    const handle = username.replace(/^@/, '');
    const text = [
      '👨‍💻',
      ' ',
      'По любым вопросам обращайтесь к ',
      '*менеджеру*',
      ' — ',
      `[${username}](https://t.me/${handle})`,
    ].join('');

    await ctx.reply(text, {
      parse_mode: 'MarkdownV2',
    });
  }
}
