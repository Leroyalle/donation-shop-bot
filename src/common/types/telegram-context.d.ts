import type { SessionFlavor } from 'grammy';
import type { ConversationControls } from '@grammyjs/conversations';
import type { ITopupDataCollection } from './topup-data-collection.type';

declare module 'grammy' {
  interface SessionData {
    topupData: ITopupDataCollection | null;
  }

  interface Context extends SessionFlavor<SessionData> {
    conversation: ConversationControls;
  }
}
