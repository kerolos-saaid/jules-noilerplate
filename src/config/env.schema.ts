import { z } from "zod";

export const EnvironmentSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  API_VERSION: z.string().default("v1"),

  // Database
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),
  DB_RUN_MIGRATIONS: z.coerce.boolean().default(false),

  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),

  // Security
  CORS_ORIGIN: z.string().default("*"),
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(10),

  // AWS S3
  AWS_S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_ACL: z.string().optional().default("public-read"),
});

export type Environment = z.infer<typeof EnvironmentSchema>;
