import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLocationToSessions1710000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add location column to sessions table
    await queryRunner.addColumn(
      'sessions',
      new TableColumn({
        name: 'location',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove location column from sessions table
    await queryRunner.dropColumn('sessions', 'location');
  }
}
