import { DataSource } from 'typeorm';
import { BaseSeeder } from './base-seeder';
import { Faq } from '../faq/entities/faq.entity';

export class FaqSeeder extends BaseSeeder {
  getName(): string {
    return 'FAQSeeder';
  }

  async run(): Promise<void> {
    const hasFaqs = await this.hasTable('faqs');
    if (!hasFaqs) {
      this.logger.warn('FAQs table does not exist. Skipping FAQ seeding.');
      return;
    }

    this.logger.log('Seeding FAQ data...');

    // Clear existing FAQ data
    await this.query(`DELETE FROM faqs`);

    // Insert new FAQ data using repository
    const manager = this.getManager();
    const faqRepository = manager.getRepository(Faq);

    const faqs = faqRepository.create([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        question: 'How can I participate in the marathon?',
        answer: 'To participate in the marathon, you first need to register on the website and then sign up for available events through your user panel. After completing registration, you can participate in the marathon.',
        isActive: true,
        order: 1,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        question: 'Do I need to pay a fee to participate in the marathon?',
        answer: 'Yes, participating in the marathon involves a fee that varies depending on the type of event and participation level. Fee details are specified on each event page.',
        isActive: true,
        order: 2,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        question: 'How can I check my account status?',
        answer: 'To check your account status, log into your user panel and from the "My Account" section, you can view your balance, transactions, and other account information.',
        isActive: true,
        order: 3,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        question: 'Is there a refund policy?',
        answer: 'Yes, if you withdraw from participating in an event, a refund is possible according to existing rules and regulations. Contact support for more details.',
        isActive: true,
        order: 4,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        question: 'How can I contact support?',
        answer: 'To contact support, you can reach us through the ticket system, email, or phone call. Contact information is available in the "Contact Us" section.',
        isActive: true,
        order: 5,
      },
    ]);

    await faqRepository.save(faqs);

    this.logger.log('✓ FAQ data seeded successfully');
  }

  async clean(): Promise<void> {
    const hasFaqs = await this.hasTable('faqs');
    if (!hasFaqs) {
      return;
    }

    this.logger.log('Cleaning FAQ data...');

    // Remove the seeded FAQ data
    await this.query(`
      DELETE FROM faqs WHERE id IN (
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440005'
      )
    `);

    this.logger.log('✓ FAQ data cleaned');
  }
}
