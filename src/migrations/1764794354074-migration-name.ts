import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName1764794354074 implements MigrationInterface {
  name = 'MigrationName1764794354074';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD "tgUsername" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "tgUsername"`);
  }
}
