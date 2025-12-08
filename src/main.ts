import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import { RequestIdInterceptor } from "./core/interceptors/request-id.interceptor";
import { ClsService } from "nestjs-cls";
import { QueryExceptionFilter } from "./common/filters/query-exception.filter";

async function setupSwagger(app) {
  const config = new DocumentBuilder()
    .setTitle("NestJS Boilerplate API")
    .setDescription("The NestJS Boilerplate API description")
    .setVersion("1.0")
    .addBearerAuth()
    .addServer("/api/v1", "API v1")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT") as number;
  const corsOrigin = configService.get<string>("CORS_ORIGIN");
  const nodeEnv = configService.get<string>("NODE_ENV");

  // Security Middlewares
  app.use(helmet());
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin === "*"
        ? true
        : corsOrigin.split(",")
      : false,
    credentials: true,
  });
  app.use(compression());

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      transform: true, // Transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw an error if unknown properties are present
    }),
  );

  // Global Filters
  app.useGlobalFilters(new QueryExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(new RequestIdInterceptor(app.get(ClsService)));

  // Swagger
  if (nodeEnv !== "production") {
    setupSwagger(app);
  }

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  app.enableShutdownHooks();

  await app.listen(port);
}
bootstrap();
