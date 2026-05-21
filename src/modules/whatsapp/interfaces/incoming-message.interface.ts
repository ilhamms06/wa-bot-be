export interface IncomingMessage {
  from: string;
  body: string;
  messageId: string;
  timestamp: Date;
  messageType: string;
  fromMe: boolean;
  isGroup: boolean;
  sender: string | null;
}
