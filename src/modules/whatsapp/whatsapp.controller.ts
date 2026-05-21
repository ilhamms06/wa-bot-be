import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Res,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as QRCode from 'qrcode';
import { WhatsappService } from './whatsapp.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get WhatsApp connection status',
    description:
      'Returns current connection status and connected phone number.',
  })
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('groups')
  @ApiOperation({
    summary: 'List all joined WhatsApp groups',
    description:
      'Returns all groups the connected account participates in, with their JID, name, and participant count.',
  })
  getGroups() {
    return this.whatsappService.getGroups();
  }

  @Get('qr')
  @ApiOperation({
    summary: 'Get QR code string for WhatsApp login',
    description:
      'Returns the raw QR code string. Use /whatsapp/qr-image to get it as a PNG image.',
  })
  getQrCode() {
    const qr = this.whatsappService.getQrCode();
    if (!qr) {
      throw new NotFoundException(
        'No QR code available — WhatsApp may already be connected',
      );
    }
    return { qr };
  }

  @Get('qr-image')
  @ApiOperation({
    summary: 'Get QR code as PNG image',
    description:
      'Returns the QR code as a PNG image. Open this URL directly in a browser or <img> tag to scan with WhatsApp.',
  })
  @ApiProduces('image/png')
  async getQrImage(@Res() res: Response) {
    const qr = this.whatsappService.getQrCode();
    if (!qr) {
      throw new NotFoundException(
        'No QR code available — WhatsApp may already be connected',
      );
    }
    const buffer = await QRCode.toBuffer(qr, { width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.end(buffer);
  }

  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Logout and reset WhatsApp session',
    description:
      'Logs out the current session, clears auth credentials, and generates a new QR code.',
  })
  @ApiNoContentResponse({ description: 'Session logged out successfully' })
  async logout() {
    await this.whatsappService.logout();
  }
}
