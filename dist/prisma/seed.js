"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
require("dotenv/config");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Start seeding...');
    const adminEmail = 'gusaindeekshant@gmail.com';
    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            phone: '9999999999',
            name: 'Admin User',
            role: 'ADMIN',
        },
    });
    console.log(`✅ Admin user: ${adminUser.email}`);
    const store = await prisma.store.upsert({
        where: { slug: 'default-store' },
        update: {},
        create: {
            name: 'AE Naturals Store',
            slug: 'default-store',
            industry: 'Health & Wellness',
        },
    });
    console.log(`🏪 Store created: ${store.name}`);
    const categories = await Promise.all([
        prisma.category.upsert({
            where: { slug: 'flowers' },
            update: {},
            create: { name: 'Flowers', slug: 'flowers' },
        }),
        prisma.category.upsert({
            where: { slug: 'cakes' },
            update: {},
            create: { name: 'Cakes', slug: 'cakes' },
        }),
    ]);
    console.log(`📦 Categories created`);
    const product = await prisma.product.create({
        data: {
            storeId: store.id,
            name: 'Red Velvet Roses',
            slug: 'red-velvet-roses',
            description: 'Beautiful bouquet of red roses',
            price: 699,
            oldPrice: 899,
            images: [
                'https://images.unsplash.com/photo-1548610762-7c6afe24c261',
            ],
            categoryId: categories[0].id,
            ingredients: 'Fresh roses',
            careInstructions: ['Keep in water', 'Avoid sunlight'],
            deliveryInfo: ['Same day delivery'],
            attributes: {
                create: [
                    { name: 'Stems', value: '12' },
                    { name: 'Color', value: 'Red' },
                ],
            },
            variants: {
                create: [
                    { name: 'Standard', priceModifier: 0, stock: 100 },
                    { name: 'Premium', priceModifier: 200, stock: 50 },
                ],
            },
        },
    });
    console.log(`🌹 Product created: ${product.name}`);
    await prisma.providerConfig.createMany({
        data: [
            {
                type: client_1.ProviderType.EMAIL,
                provider: 'SMTP',
                isActive: true,
                priority: 1,
                config: JSON.stringify({
                    host: 'smtp.office365.com',
                    port: 587,
                    user: 'test@mail.com',
                    password: 'password',
                }),
            },
            {
                type: client_1.ProviderType.EMAIL,
                provider: 'AWS_SES',
                isActive: false,
                priority: 2,
                config: JSON.stringify({
                    accessKeyId: 'AWS_KEY',
                    secretAccessKey: 'AWS_SECRET',
                    region: 'ap-south-1',
                }),
            },
            {
                type: client_1.ProviderType.SMS,
                provider: 'MSG91',
                isActive: true,
                priority: 1,
                config: JSON.stringify({
                    authKey: 'MSG91_KEY',
                }),
            },
            {
                type: client_1.ProviderType.SMS,
                provider: 'FAST2SMS',
                isActive: false,
                priority: 2,
                config: JSON.stringify({
                    apiKey: 'FAST2SMS_KEY',
                }),
            },
            {
                type: client_1.ProviderType.PAYMENT,
                provider: 'RAZORPAY',
                isActive: true,
                priority: 1,
                config: JSON.stringify({
                    key_id: 'rzp_test_key',
                    key_secret: 'rzp_secret',
                }),
            },
            {
                type: client_1.ProviderType.PAYMENT,
                provider: 'STRIPE',
                isActive: false,
                priority: 2,
                config: JSON.stringify({
                    secret_key: 'stripe_secret',
                }),
            },
        ],
        skipDuplicates: true,
    });
    console.log(`⚙️ Provider configs seeded`);
    await prisma.shippingRule.create({
        data: {
            storeId: store.id,
            pincode: '560059',
            deliveryCharge: 50,
            isOperational: true,
        },
    });
    console.log(`🚚 Shipping rule added`);
    console.log('🎉 Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=seed.js.map