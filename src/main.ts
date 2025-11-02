import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { I18nService } from './i18n/i18n.service';
import cookieParser from 'cookie-parser';
import { AppDataSource } from './config/data-source';

async function bootstrap() {
  // Run migrations before starting the app
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✓ Database connection initialized');
      
      // Run migrations explicitly to ensure they execute
      const migrations = await AppDataSource.runMigrations();
      if (migrations.length > 0) {
        console.log(`✓ Executed ${migrations.length} pending migration(s):`, 
          migrations.map(m => m.name).join(', '));
      } else {
        console.log('✓ All migrations are up to date');
      }
    }
  } catch (error) {
    console.error('✗ Error during database initialization:', error);
    // Continue anyway as TypeORM module will try to connect
  }
  
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
