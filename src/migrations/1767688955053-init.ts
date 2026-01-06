import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1767688955053 implements MigrationInterface {
  name = 'Init1767688955053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD "steamName" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "steamName"`);
  }
}
