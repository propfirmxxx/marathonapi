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
        question: {
          en: 'How can I participate in the marathon?',
          fa: 'چگونه می‌توانم در ماراتن شرکت کنم؟',
          ar: 'كيف يمكنني المشاركة في الماراثون؟',
          tr: 'Maratona nasıl katılabilirim?',
        },
        answer: {
          en: 'To participate in the marathon, you first need to register on the website and then sign up for available events through your user panel. After completing registration, you can participate in the marathon.',
          fa: 'برای شرکت در ماراتن، ابتدا باید در وب‌سایت ثبت‌نام کنید و سپس از طریق پنل کاربری خود برای رویدادهای موجود ثبت‌نام نمایید. پس از تکمیل ثبت‌نام، می‌توانید در ماراتن شرکت کنید.',
          ar: 'للمشاركة في الماراثون، تحتاج أولاً إلى التسجيل على الموقع ثم التسجيل في الأحداث المتاحة من خلال لوحة المستخدم الخاصة بك. بعد إكمال التسجيل، يمكنك المشاركة في الماراثون.',
          tr: 'Maratona katılmak için öncelikle web sitesine kaydolmanız ve ardından kullanıcı paneliniz üzerinden mevcut etkinliklere kaydolmanız gerekmektedir. Kayıt tamamlandıktan sonra maratona katılabilirsiniz.',
        },
        isActive: true,
        order: 1,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        question: {
          en: 'Do I need to pay a fee to participate in the marathon?',
          fa: 'آیا برای شرکت در ماراتن باید هزینه‌ای پرداخت کنم؟',
          ar: 'هل أحتاج إلى دفع رسوم للمشاركة في الماراثون؟',
          tr: 'Maratona katılmak için ücret ödemem gerekiyor mu?',
        },
        answer: {
          en: 'Yes, participating in the marathon involves a fee that varies depending on the type of event and participation level. Fee details are specified on each event page.',
          fa: 'بله، شرکت در ماراتن شامل هزینه‌ای است که بسته به نوع رویداد و سطح شرکت متفاوت است. جزئیات هزینه در صفحه هر رویداد مشخص شده است.',
          ar: 'نعم، تتضمن المشاركة في الماراثون رسومًا تختلف حسب نوع الحدث ومستوى المشاركة. يتم تحديد تفاصيل الرسوم في صفحة كل حدث.',
          tr: 'Evet, maratona katılım, etkinlik türüne ve katılım düzeyine bağlı olarak değişen bir ücret içerir. Ücret detayları her etkinlik sayfasında belirtilmiştir.',
        },
        isActive: true,
        order: 2,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        question: {
          en: 'How can I check my account status?',
          fa: 'چگونه می‌توانم وضعیت حساب خود را بررسی کنم؟',
          ar: 'كيف يمكنني التحقق من حالة حسابي؟',
          tr: 'Hesap durumumu nasıl kontrol edebilirim?',
        },
        answer: {
          en: 'To check your account status, log into your user panel and from the "My Account" section, you can view your balance, transactions, and other account information.',
          fa: 'برای بررسی وضعیت حساب خود، به پنل کاربری خود وارد شوید و از بخش "حساب من"، می‌توانید موجودی، تراکنش‌ها و سایر اطلاعات حساب خود را مشاهده کنید.',
          ar: 'للتحقق من حالة حسابك، قم بتسجيل الدخول إلى لوحة المستخدم الخاصة بك ومن قسم "حسابي"، يمكنك عرض رصيدك والمعاملات ومعلومات الحساب الأخرى.',
          tr: 'Hesap durumunuzu kontrol etmek için kullanıcı panelinize giriş yapın ve "Hesabım" bölümünden bakiyenizi, işlemlerinizi ve diğer hesap bilgilerinizi görüntüleyebilirsiniz.',
        },
        isActive: true,
        order: 3,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        question: {
          en: 'Is there a refund policy?',
          fa: 'آیا سیاست بازپرداخت وجود دارد؟',
          ar: 'هل توجد سياسة استرداد؟',
          tr: 'İade politikası var mı?',
        },
        answer: {
          en: 'Yes, if you withdraw from participating in an event, a refund is possible according to existing rules and regulations. Contact support for more details.',
          fa: 'بله، در صورت انصراف از شرکت در یک رویداد، بازپرداخت طبق قوانین و مقررات موجود امکان‌پذیر است. برای جزئیات بیشتر با پشتیبانی تماس بگیرید.',
          ar: 'نعم، إذا انسحبت من المشاركة في حدث، فإن الاسترداد ممكن وفقًا للقواعد واللوائح الموجودة. اتصل بالدعم لمزيد من التفاصيل.',
          tr: 'Evet, bir etkinliğe katılmaktan vazgeçerseniz, mevcut kural ve düzenlemelere göre iade mümkündür. Daha fazla ayrıntı için destekle iletişime geçin.',
        },
        isActive: true,
        order: 4,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        question: {
          en: 'How can I contact support?',
          fa: 'چگونه می‌توانم با پشتیبانی تماس بگیرم؟',
          ar: 'كيف يمكنني الاتصال بالدعم؟',
          tr: 'Destekle nasıl iletişime geçebilirim?',
        },
        answer: {
          en: 'To contact support, you can reach us through the ticket system, email, or phone call. Contact information is available in the "Contact Us" section.',
          fa: 'برای تماس با پشتیبانی، می‌توانید از طریق سیستم تیکت، ایمیل یا تماس تلفنی با ما در ارتباط باشید. اطلاعات تماس در بخش "تماس با ما" موجود است.',
          ar: 'للاتصال بالدعم، يمكنك الوصول إلينا من خلال نظام التذاكر أو البريد الإلكتروني أو المكالمة الهاتفية. معلومات الاتصال متاحة في قسم "اتصل بنا".',
          tr: 'Destekle iletişime geçmek için bilet sistemi, e-posta veya telefon görüşmesi yoluyla bize ulaşabilirsiniz. İletişim bilgileri "Bize Ulaşın" bölümünde mevcuttur.',
        },
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
