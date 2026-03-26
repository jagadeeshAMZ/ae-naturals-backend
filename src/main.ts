import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Add the Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties that do not have any decorators in the DTO
      transform: true, // Automatically transforms payloads to be objects typed according to their DTO classes
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are provided
    }),
  );
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1'); // Add this line
  const origins = process.env.CORS_ORIGINS?.split(',');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origins?.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });
  const config = new DocumentBuilder()
    .setTitle('Multi-Tenant E-Commerce API')
    .setDescription('Production API for Flowers, Cakes, and Apparel stores')
    .setVersion('1.0')
    .addTag('products')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
