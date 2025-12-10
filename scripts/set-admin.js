const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const email = 'shahfaisal106@gmail.com';
  
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin' },
  });
  
  console.log(`✅ User ${user.email} is now an admin!`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Role: ${user.role}`);
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

