import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { I18nService } from './i18n/i18n.service';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for all origins
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Enable cookie parsing
  app.use(cookieParser());
  
  app.setGlobalPrefix('apiv1');
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Get I18nService instance and apply global response interceptor
  const i18nService = app.get(I18nService);
  app.useGlobalInterceptors(new ResponseInterceptor(i18nService));

  const swaggerPath = 'swagger';

  const config = new DocumentBuilder()
    .setTitle('Marathon API')
    .setDescription('The Marathon API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerPath, app, document);
  
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
