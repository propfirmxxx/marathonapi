import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateTokyoDataTables1710000000017 implements MigrationInterface {
  name = 'CreateTokyoDataTables1710000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create metatrader_accounts table if it doesn't exist
    await queryRunner.createTable(
      new Table({
        name: 'metatrader_accounts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'login',
            type: 'varchar',
          },
          {
            name: 'masterPassword',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'investorPassword',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'server',
            type: 'varchar',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'marathonParticipantId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'undeployed'",
          },
          {
            name: 'platform',
            type: 'varchar',
            default: "'mt5'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for metatrader_accounts
    await queryRunner.createIndex(
      'metatrader_accounts',
      new TableIndex({
        name: 'IDX_metatrader_accounts_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'metatrader_accounts',
      new TableIndex({
        name: 'IDX_metatrader_accounts_marathonParticipantId',
        columnNames: ['marathonParticipantId'],
      }),
    );

    // Create FK for metatrader_accounts
    // Check if FK already exists to avoid error if re-running
    const table = await queryRunner.getTable('metatrader_accounts');
    const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1);
    if (!foreignKey) {
        await queryRunner.createForeignKey(
        'metatrader_accounts',
        new TableForeignKey({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
        }),
        );
    }


    // Create tokyo_account_data table
    await queryRunner.createTable(
      new Table({
        name: 'tokyo_account_data',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'metaTraderAccountId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'equity',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'profit',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'margin',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'freeMargin',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'leverage',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'positions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'orders',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'rawData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'dataTimestamp',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create tokyo_transaction_history table
    await queryRunner.createTable(
      new Table({
        name: 'tokyo_transaction_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'metaTraderAccountId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'positionId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'orderTicket',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'openTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'closeTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'volume',
            type: 'decimal',
            precision: 15,
            scale: 5,
            isNullable: true,
          },
          {
            name: 'symbol',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'openPrice',
            type: 'decimal',
            precision: 15,
            scale: 5,
            isNullable: true,
          },
          {
            name: 'closePrice',
            type: 'decimal',
            precision: 15,
            scale: 5,
            isNullable: true,
          },
          {
            name: 'stopLoss',
            type: 'decimal',
            precision: 15,
            scale: 5,
            isNullable: true,
          },
          {
            name: 'takeProfit',
            type: 'decimal',
            precision: 15,
            scale: 5,
            isNullable: true,
          },
          {
            name: 'profit',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'commission',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'swap',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'risk',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'riskPercent',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'balanceAtOpen',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rawData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create tokyo_performance table
    await queryRunner.createTable(
      new Table({
        name: 'tokyo_performance',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'metaTraderAccountId',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'equity',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'profit',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'margin',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'freeMargin',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'marginLevel',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'creditFacility',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'totalNetProfit',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'grossProfit',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'grossLoss',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'profitFactor',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'expectedPayoff',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'recoveryFactor',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'sharpeRatio',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'balanceDrawdownAbsolute',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'balanceDrawdownMaximal',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'balanceDrawdownRelativePercent',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'totalTrades',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'profitTrades',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'lossTrades',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'largestProfitTrade',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'largestLossTrade',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'averageProfitTrade',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'averageLossTrade',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'maxConsecutiveWins',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'maxConsecutiveWinsProfit',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'maxConsecutiveLosses',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'maxConsecutiveLossesLoss',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'averageConsecutiveWins',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'averageConsecutiveLosses',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'rawData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'dataTimestamp',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create tokyo_balance_history table
    await queryRunner.createTable(
      new Table({
        name: 'tokyo_balance_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'metaTraderAccountId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'time',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'ticket',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'delta',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rawData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create tokyo_equity_history table
    await queryRunner.createTable(
      new Table({
        name: 'tokyo_equity_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'metaTraderAccountId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'time',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'equity',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'rawData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'tokyo_account_data',
      new TableForeignKey({
        columnNames: ['metaTraderAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'metatrader_accounts',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tokyo_transaction_history',
      new TableForeignKey({
        columnNames: ['metaTraderAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'metatrader_accounts',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tokyo_performance',
      new TableForeignKey({
        columnNames: ['metaTraderAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'metatrader_accounts',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tokyo_balance_history',
      new TableForeignKey({
        columnNames: ['metaTraderAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'metatrader_accounts',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tokyo_equity_history',
      new TableForeignKey({
        columnNames: ['metaTraderAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'metatrader_accounts',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'tokyo_account_data',
      new TableIndex({
        name: 'IDX_tokyo_account_data_metaTraderAccountId_updatedAt',
        columnNames: ['metaTraderAccountId', 'updatedAt'],
      }),
    );

    await queryRunner.createIndex(
      'tokyo_transaction_history',
      new TableIndex({
        name: 'IDX_tokyo_transaction_history_metaTraderAccountId_openTime',
        columnNames: ['metaTraderAccountId', 'openTime'],
      }),
    );

    await queryRunner.createIndex(
      'tokyo_transaction_history',
      new TableIndex({
        name: 'IDX_tokyo_transaction_history_metaTraderAccountId_closeTime',
        columnNames: ['metaTraderAccountId', 'closeTime'],
      }),
    );

    await queryRunner.createIndex(
      'tokyo_performance',
      new TableIndex({
        name: 'IDX_tokyo_performance_metaTraderAccountId_updatedAt',
        columnNames: ['metaTraderAccountId', 'updatedAt'],
      }),
    );

    await queryRunner.createIndex(
      'tokyo_balance_history',
      new TableIndex({
        name: 'IDX_tokyo_balance_history_metaTraderAccountId_time',
        columnNames: ['metaTraderAccountId', 'time'],
      }),
    );

    await queryRunner.createIndex(
      'tokyo_equity_history',
      new TableIndex({
        name: 'IDX_tokyo_equity_history_metaTraderAccountId_time',
        columnNames: ['metaTraderAccountId', 'time'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('tokyo_equity_history', 'IDX_tokyo_equity_history_metaTraderAccountId_time');
    await queryRunner.dropIndex('tokyo_balance_history', 'IDX_tokyo_balance_history_metaTraderAccountId_time');
    await queryRunner.dropIndex('tokyo_performance', 'IDX_tokyo_performance_metaTraderAccountId_updatedAt');
    await queryRunner.dropIndex('tokyo_transaction_history', 'IDX_tokyo_transaction_history_metaTraderAccountId_closeTime');
    await queryRunner.dropIndex('tokyo_transaction_history', 'IDX_tokyo_transaction_history_metaTraderAccountId_openTime');
    await queryRunner.dropIndex('tokyo_account_data', 'IDX_tokyo_account_data_metaTraderAccountId_updatedAt');
    await queryRunner.dropIndex('metatrader_accounts', 'IDX_metatrader_accounts_marathonParticipantId');
    await queryRunner.dropIndex('metatrader_accounts', 'IDX_metatrader_accounts_userId');

    // Drop foreign keys
    await queryRunner.dropForeignKey('tokyo_equity_history', 'FK_tokyo_equity_history_metaTraderAccountId');
    await queryRunner.dropForeignKey('tokyo_balance_history', 'FK_tokyo_balance_history_metaTraderAccountId');
    await queryRunner.dropForeignKey('tokyo_performance', 'FK_tokyo_performance_metaTraderAccountId');
    await queryRunner.dropForeignKey('tokyo_transaction_history', 'FK_tokyo_transaction_history_metaTraderAccountId');
    await queryRunner.dropForeignKey('tokyo_account_data', 'FK_tokyo_account_data_metaTraderAccountId');

    // Drop tables
    await queryRunner.dropTable('tokyo_equity_history');
    await queryRunner.dropTable('tokyo_balance_history');
    await queryRunner.dropTable('tokyo_performance');
    await queryRunner.dropTable('tokyo_transaction_history');
    await queryRunner.dropTable('tokyo_account_data');
    await queryRunner.dropTable('metatrader_accounts');
  }
}
