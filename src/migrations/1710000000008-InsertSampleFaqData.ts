import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertSampleFaqData1710000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Clear existing FAQ data
    await queryRunner.query(`DELETE FROM faqs`);
    
    // Insert new FAQ data
    await queryRunner.query(`
      INSERT INTO faqs (id, question, answer, "isActive", "order", "createdAt", "updatedAt") VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'How can I participate in the marathon?', 'To participate in the marathon, you first need to register on the website and then sign up for available events through your user panel. After completing registration, you can participate in the marathon.', true, 1, NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440002', 'Do I need to pay a fee to participate in the marathon?', 'Yes, participating in the marathon involves a fee that varies depending on the type of event and participation level. Fee details are specified on each event page.', true, 2, NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440003', 'How can I check my account status?', 'To check your account status, log into your user panel and from the "My Account" section, you can view your balance, transactions, and other account information.', true, 3, NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440004', 'Is there a refund policy?', 'Yes, if you withdraw from participating in an event, a refund is possible according to existing rules and regulations. Contact support for more details.', true, 4, NOW(), NOW()),
      ('550e8400-e29b-41d4-a716-446655440005', 'How can I contact support?', 'To contact support, you can reach us through the ticket system, email, or phone call. Contact information is available in the "Contact Us" section.', true, 5, NOW(), NOW())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the inserted FAQ data
    await queryRunner.query(`
      DELETE FROM faqs WHERE id IN (
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440005'
      )
    `);
  }
}
