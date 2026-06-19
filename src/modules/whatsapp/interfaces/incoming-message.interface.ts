import type { WAMessage } from '@whiskeysockets/baileys';

export interface IncomingMessage {
  from: string;
  body: string;
  messageId: string;
  timestamp: Date;
  messageType: string;
  fromMe: boolean;
  isGroup: boolean;
  sender: string | null;
  /** Original Baileys message — used to send quoted (reply) responses. */
  raw?: WAMessage;
}
