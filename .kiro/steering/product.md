# Product Overview

This is an enterprise-grade NestJS boilerplate designed for building production-ready, scalable monolithic applications. It provides a comprehensive foundation with security, observability, and performance features built-in.

## Core Purpose

Provide a "batteries-included" starting point for building robust backend APIs with:
- JWT-based authentication with refresh tokens
- Role-Based Access Control (RBAC) and Policy-Based Authorization (CASL)
- Redis-backed caching and rate limiting
- Background job processing with BullMQ
- Comprehensive observability (structured logging, health checks, Prometheus metrics)
- TypeORM with PostgreSQL for data persistence

## Key Features

- Modular, domain-driven architecture
- Type-safe configuration with Zod validation
- Automated database migrations and seeding
- Flexible query system (pagination, sorting, filtering)
- File upload support (local/S3)
- Internationalization (i18n)
- Circuit breaker pattern for resilience
- Docker-based deployment with multi-stage builds
