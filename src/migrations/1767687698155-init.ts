import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1767687698155 implements MigrationInterface {
  name = 'Init1767687698155';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."product_type_enum" RENAME TO "product_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_type_enum" AS ENUM('CARD', 'STARS', 'KEY', 'GAME')`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "type" TYPE "public"."product_type_enum" USING "type"::"text"::"public"."product_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."product_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."product_type_enum_old" AS ENUM('CARD', 'STARS', 'KEY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "type" TYPE "public"."product_type_enum_old" USING "type"::"text"::"public"."product_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."product_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."product_type_enum_old" RENAME TO "product_type_enum"`,
    );
  }
}
