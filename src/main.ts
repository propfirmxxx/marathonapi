import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { I18nService } from './i18n/i18n.service';
import cookieParser from 'cookie-parser';
import { AppDataSource } from './config/data-source';
import { SeederService } from './seeders/seeder.service';

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

      // Run seeders after migrations
      if (process.env.SEED_MOCK_DATA === 'true') {
        console.log('Running seeders...');
        const seederService = new SeederService(AppDataSource);
        await seederService.seed();
      }
    }
  } catch (error) {
    console.error('\n✗ Error during database initialization:');
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      console.error('Error:', error);
    }
    
    // Provide helpful hints based on common error types
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
        console.error('\n💡 Hint: Check your database connection settings in .env file:');
        console.error('   - DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME');
        console.error('   - Make sure PostgreSQL is running and accessible');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.error('\n💡 Hint: The database does not exist. Please create it first:');
        console.error('   CREATE DATABASE your_database_name;');
      } else if (error.message.includes('migration') || error.message.includes('Migration')) {
        console.error('\n💡 Hint: There was an error running migrations.');
        console.error('   Check your migration files for syntax errors.');
      }
    }
    
    // Exit the process if migrations fail - app cannot run without database tables
    console.error('\n✗ Exiting application due to database initialization failure');
    process.exit(1);
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

  // Get I18nService and SettingsService instances and apply global response interceptor
  const i18nService = app.get(I18nService);
  const settingsService = app.get(SettingsService);
  app.useGlobalInterceptors(new ResponseInterceptor(i18nService, settingsService));

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
