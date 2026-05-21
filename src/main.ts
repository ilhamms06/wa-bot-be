import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS — allow all origins for now (FE will connect later)
  app.enableCors();

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('WA Bot API')
    .setDescription(
      'WhatsApp auto-reply bot backend with AI integration — manage config, rules, whitelist, and message logs.',
    )
    .setVersion('1.0')
    .addTag('WhatsApp', 'WhatsApp connection and session')
    .addTag('Config', 'Bot configuration (AI settings, rules, templates)')
    .addTag('Whitelist', 'Manage phone numbers allowed to receive auto-replies')
    .addTag('Messages', 'Incoming message logs')
    .addTag('AI', 'AI testing endpoints')
    .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' }, 'X-Api-Key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}/api`);
  console.log(`Swagger docs:           http://localhost:${port}/api/docs`);
}

void bootstrap();
