import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMarathonAnnouncementsSettings1710000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_settings');
    
    if (table) {
      const marathonAnnouncementsEmailEnabledColumn = table.findColumnByName('marathonAnnouncementsEmailEnabled');
      const marathonAnnouncementsSmsEnabledColumn = table.findColumnByName('marathonAnnouncementsSmsEnabled');

      // Add marathonAnnouncementsEmailEnabled column if it doesn't exist
      if (!marathonAnnouncementsEmailEnabledColumn) {
        await queryRunner.addColumn(
          'user_settings',
          new TableColumn({
            name: 'marathonAnnouncementsEmailEnabled',
            type: 'boolean',
            default: true,
          }),
        );
      }

      // Add marathonAnnouncementsSmsEnabled column if it doesn't exist
      if (!marathonAnnouncementsSmsEnabledColumn) {
        await queryRunner.addColumn(
          'user_settings',
          new TableColumn({
            name: 'marathonAnnouncementsSmsEnabled',
            type: 'boolean',
            default: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_settings');
    
    if (table) {
      const marathonAnnouncementsEmailEnabledColumn = table.findColumnByName('marathonAnnouncementsEmailEnabled');
      const marathonAnnouncementsSmsEnabledColumn = table.findColumnByName('marathonAnnouncementsSmsEnabled');

      // Remove marathonAnnouncementsEmailEnabled column if it exists
      if (marathonAnnouncementsEmailEnabledColumn) {
        await queryRunner.dropColumn('user_settings', 'marathonAnnouncementsEmailEnabled');
      }

      // Remove marathonAnnouncementsSmsEnabled column if it exists
      if (marathonAnnouncementsSmsEnabledColumn) {
        await queryRunner.dropColumn('user_settings', 'marathonAnnouncementsSmsEnabled');
      }
    }
  }
}

