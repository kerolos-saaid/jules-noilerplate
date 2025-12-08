import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIndexes1733097600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email column to user table
    await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "email" character varying NOT NULL DEFAULT ''
        `);

    // Add unique constraint on email
    await queryRunner.query(`
            ALTER TABLE "user"
            ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email")
        `);

    // Create index on users.email for query performance
    await queryRunner.query(`
            CREATE INDEX "IDX_user_email" ON "user" ("email")
        `);

    // Create index on users.createdAt for query performance
    await queryRunner.query(`
            CREATE INDEX "IDX_user_createdAt" ON "user" ("createdAt")
        `);

    // Create index on users.updatedAt for query performance
    await queryRunner.query(`
            CREATE INDEX "IDX_user_updatedAt" ON "user" ("updatedAt")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
            DROP INDEX "IDX_user_updatedAt"
        `);

    await queryRunner.query(`
            DROP INDEX "IDX_user_createdAt"
        `);

    await queryRunner.query(`
            DROP INDEX "IDX_user_email"
        `);

    // Drop unique constraint on email
    await queryRunner.query(`
            ALTER TABLE "user"
            DROP CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22"
        `);

    // Drop email column
    await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN "email"
        `);
  }
}
