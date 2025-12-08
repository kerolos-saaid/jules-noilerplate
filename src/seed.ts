import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SeedingService } from "./modules/seeding/seeding.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(SeedingService);
  await seeder.seed();
  await app.close();
  return;
}

void bootstrap();
