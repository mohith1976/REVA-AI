/**
 * Reset mobile number for test user
 * Run: node reset-mobile.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetMobile() {
  const aadhaarMasked = 'XXXX-XXXX-9322'; // Your test Aadhaar
  
  const user = await prisma.user.findFirst({
    where: { aadhaarMasked }
  });

  if (!user) {
    console.log('❌ User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('🔄 Resetting mobile for:', user.name, '(' + user.aadhaarMasked + ')');
  console.log('   Current mobile:', user.mobileNumber);
  console.log('   Registration complete:', user.registrationComplete);
  
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mobileNumber: null,
      registrationComplete: false
    }
  });
  
  console.log('✅ Mobile number reset successfully');
  console.log('💡 Now try Aadhaar verification again - it will ask for mobile number');
  
  await prisma.$disconnect();
}

resetMobile().catch(console.error);
