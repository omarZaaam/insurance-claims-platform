import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Claims Service running on port ${port}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL || 'Not configured'}`);
  console.log(`📨 Kafka: ${process.env.KAFKA_BROKER || 'Not configured'}`);
}

bootstrap();

// Made with Bob
