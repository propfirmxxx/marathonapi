import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveSettingsFields1710000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns exist before dropping
    const table = await queryRunner.getTable('user_settings');
    
    if (table) {
      const inAppNotificationsEnabledColumn = table.findColumnByName('inAppNotificationsEnabled');
      const showTradingInfoColumn = table.findColumnByName('showTradingInfo');

      // Drop inAppNotificationsEnabled column if it exists
      if (inAppNotificationsEnabledColumn) {
        await queryRunner.dropColumn('user_settings', 'inAppNotificationsEnabled');
      }

      // Drop showTradingInfo column if it exists
      if (showTradingInfoColumn) {
        await queryRunner.dropColumn('user_settings', 'showTradingInfo');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if columns exist before adding
    const table = await queryRunner.getTable('user_settings');
    
    if (table) {
      const inAppNotificationsEnabledColumn = table.findColumnByName('inAppNotificationsEnabled');
      const showTradingInfoColumn = table.findColumnByName('showTradingInfo');

      // Restore inAppNotificationsEnabled column if it doesn't exist
      if (!inAppNotificationsEnabledColumn) {
        await queryRunner.addColumn(
          'user_settings',
          new TableColumn({
            name: 'inAppNotificationsEnabled',
            type: 'boolean',
            default: true,
          }),
        );
      }

      // Restore showTradingInfo column if it doesn't exist
      if (!showTradingInfoColumn) {
        await queryRunner.addColumn(
          'user_settings',
          new TableColumn({
            name: 'showTradingInfo',
            type: 'boolean',
            default: true,
          }),
        );
      }
    }
  }
}

