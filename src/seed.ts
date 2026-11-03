// src/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SeedService } from './seed/seed.service.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const seedService = app.get(SeedService);
  const result = await seedService.run();

  console.log('Results:', JSON.stringify(result, null, 2));

  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
