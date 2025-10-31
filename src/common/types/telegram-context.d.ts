// ...existing code...
import type { SessionFlavor } from 'grammy';
import type { ConversationControls } from '@grammyjs/conversations';

declare module 'grammy' {
  interface SessionData {
    waitingForEmail?: boolean;
    email?: string;
  }

  interface Context extends SessionFlavor<SessionData> {
    conversation: ConversationControls;
  }
}

// ...existing code...
