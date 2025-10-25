import 'grammy';
import { SessionFlavor } from 'grammy';

interface BotSession {
  waitingForEmail?: boolean;
  email?: string;
}

declare module 'grammy' {
  interface SessionData extends BotSession {
    _?: never;
  }
  interface Context extends SessionFlavor<BotSession> {
    _?: never;
  }
}
