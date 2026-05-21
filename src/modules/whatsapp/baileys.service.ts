import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import * as fs from 'fs';
import pino from 'pino';
import { IncomingMessage } from './interfaces/incoming-message.interface';

export type ConnectionStatus = 'connecting' | 'open' | 'close';

@Injectable()
export class BaileysService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaileysService.name);
  private socket: WASocket | null = null;
  private qrCode: string | null = null;
  private connectionStatus: ConnectionStatus = 'connecting';
  private connectedPhone: string | null = null;
  private shouldReconnect = true;

  /** Cache LID → phone number resolved from remoteJidAlt for future lookups. */
  private readonly lidToPhone = new Map<string, string>();

  private messageHandlers: Array<(msg: IncomingMessage) => Promise<void>> = [];

  private readonly authDir: string;

  constructor(private readonly configService: ConfigService) {
    this.authDir =
      this.configService.get<string>('baileys.authDir') ??
      './data/baileys-auth';
  }

  async onModuleInit() {
    fs.mkdirSync(this.authDir, { recursive: true });
    await this.connect();
  }

  onModuleDestroy() {
    this.shouldReconnect = false;
    this.socket?.end(undefined);
  }

  registerMessageHandler(
    handler: (msg: IncomingMessage) => Promise<void>,
  ): void {
    this.messageHandlers.push(handler);
  }

  getStatus(): { status: ConnectionStatus; phone: string | null } {
    return {
      status: this.connectionStatus,
      phone: this.connectedPhone,
    };
  }

  getQrCode(): string | null {
    return this.qrCode;
  }

  async sendText(to: string, text: string): Promise<void> {
    if (!this.socket || this.connectionStatus !== 'open') {
      throw new Error('WhatsApp is not connected');
    }
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await this.socket.sendMessage(jid, { text });
    this.logger.log(`Message sent to ${to}`);
  }

  async getGroups(): Promise<
    Array<{ id: string; subject: string; participants: number }>
  > {
    if (!this.socket || this.connectionStatus !== 'open') {
      throw new Error('WhatsApp is not connected');
    }
    const groups = await this.socket.groupFetchAllParticipating();
    return Object.values(groups).map((g) => ({
      id: g.id,
      subject: g.subject,
      participants: g.participants.length,
    }));
  }

  async logout(): Promise<void> {
    this.shouldReconnect = false;

    if (this.socket) {
      try {
        await this.socket.logout();
      } catch {
        this.logger.warn(
          'socket.logout() failed — connection may already be closed',
        );
      }
      this.socket.end(undefined);
      this.socket = null;
    }

    // Small delay so file handles are released before we wipe the dir
    await new Promise((r) => setTimeout(r, 500));
    await this.clearAuthDir();

    this.qrCode = null;
    this.connectionStatus = 'close';
    this.connectedPhone = null;
    this.lidToPhone.clear();
    this.shouldReconnect = true;
    await this.connect();
  }

  /**
   * Delete all files inside authDir instead of the directory itself,
   * because Docker volume mount points cannot be removed.
   */
  private async clearAuthDir(retries = 4, baseDelay = 500): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const entries = fs.readdirSync(this.authDir);
        for (const entry of entries) {
          fs.rmSync(`${this.authDir}/${entry}`, {
            recursive: true,
            force: true,
          });
        }
        this.logger.log(`Cleared ${entries.length} auth files`);
        return;
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code;
        if ((code === 'EBUSY' || code === 'EPERM') && attempt < retries) {
          const delay = baseDelay * 2 ** attempt;
          this.logger.warn(
            `Auth file busy, retrying in ${delay}ms (${attempt + 1}/${retries})`,
          );
          await new Promise((r) => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
  }

  private async connect(): Promise<void> {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version } = await fetchLatestBaileysVersion();

      this.logger.log(`Connecting with Baileys v${version.join('.')}`);

      const socket = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false,
      });

      this.socket = socket;

      socket.ev.on('creds.update', () => {
        void saveCreds();
      });

      socket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          this.logger.log('QR code ready — scan with WhatsApp');
        }

        if (connection === 'open') {
          this.connectionStatus = 'open';
          this.qrCode = null;
          this.connectedPhone = socket.user?.id?.split(':')[0] ?? null;
          this.logger.log(
            `WhatsApp connected as ${this.connectedPhone ?? 'unknown'}`,
          );
        }

        if (connection === 'close') {
          this.connectionStatus = 'close';
          const statusCode = (
            lastDisconnect?.error as {
              output?: { statusCode?: number };
            }
          )?.output?.statusCode;

          const loggedOut = statusCode === DisconnectReason.loggedOut;

          this.logger.warn(
            `Connection closed (code: ${statusCode ?? 'unknown'})`,
          );

          if (!loggedOut && this.shouldReconnect) {
            this.logger.log('Reconnecting...');
            void this.connect();
          }
        }
      });

      socket.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          if (!msg.key.remoteJid) continue;

          const isGroup = isJidGroup(msg.key.remoteJid) ?? false;
          const isFromMe = msg.key.fromMe ?? false;

          const from = isGroup
            ? msg.key.remoteJid!
            : this.resolvePhoneNumber(msg.key);

          const sender = isGroup
            ? (msg.key.participant?.split('@')[0] ?? null)
            : null;

          const body =
            msg.message?.conversation ??
            msg.message?.extendedTextMessage?.text ??
            '';

          const incoming: IncomingMessage = {
            from,
            body,
            messageId: msg.key.id ?? '',
            timestamp: msg.messageTimestamp
              ? new Date(Number(msg.messageTimestamp) * 1000)
              : new Date(),
            messageType: Object.keys(msg.message ?? {})[0] ?? 'unknown',
            fromMe: isFromMe,
            isGroup,
            sender,
          };

          this.logger.log(
            `${isFromMe ? 'Outgoing to' : 'Incoming from'} ${isGroup ? `group ${from} (${sender})` : from}: "${body.substring(0, 50)}"`,
          );

          for (const handler of this.messageHandlers) {
            void handler(incoming).catch((err: unknown) => {
              this.logger.error(
                'Message handler error',
                err instanceof Error ? err.message : String(err),
              );
            });
          }
        }
      });
    } catch (err) {
      this.logger.error(
        'Failed to initialize Baileys',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Extracts the real phone number from a message key.
   * WA now sends @lid JIDs — remoteJidAlt contains the actual phone@s.whatsapp.net.
   */
  private resolvePhoneNumber(key: {
    remoteJid?: string | null;
    remoteJidAlt?: string | null;
  }): string {
    const remoteJid = key.remoteJid ?? '';
    const remoteJidAlt = key.remoteJidAlt ?? null;

    const rawId = remoteJid.split('@')[0];
    const isLid = remoteJid.endsWith('@lid');

    // Best source: remoteJidAlt contains the actual phone number
    if (remoteJidAlt) {
      const phone = remoteJidAlt.split('@')[0];
      if (isLid) {
        this.lidToPhone.set(rawId, phone);
      }
      return phone;
    }

    // Fallback: check cache from previously resolved LIDs
    if (isLid) {
      return this.lidToPhone.get(rawId) ?? rawId;
    }

    // Already a phone-based JID
    return rawId;
  }
}
