import { CallbackQuery } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { SupportService } from '../services/support.service';

@Injectable()
export class SupportUpdate {
  constructor(private readonly supportService: SupportService) {}

  @CallbackQuery('support')
  public async support(ctx: Context) {
    await ctx.answerCallbackQuery();
    await this.supportService.sendSupportReply(ctx);
  }
}
