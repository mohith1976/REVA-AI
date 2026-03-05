/**
 * Delete test user to start fresh
 * Run: node delete-test-user.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTestUser() {
  const aadhaarMasked = 'XXXX-XXXX-9322'; // Your test Aadhaar
  
  const user = await prisma.user.findFirst({
    where: { aadhaarMasked }
  });

  if (!user) {
    console.log('❌ User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('🗑️  Deleting user:', user.name, '(' + user.aadhaarMasked + ')');
  
  // Delete related records first
  await prisma.notification.deleteMany({ where: { userId: user.id } });
  await prisma.evidence.deleteMany({ where: { uploaderId: user.id } });
  await prisma.auditLog.deleteMany({ where: { userId: user.id } });
  await prisma.complaint.deleteMany({ where: { userId: user.id } });
  
  // Delete user
  await prisma.user.delete({ where: { id: user.id } });
  
  console.log('✅ User deleted successfully');
  console.log('💡 Now try Aadhaar verification again - it will ask for mobile number');
  
  await prisma.$disconnect();
}

deleteTestUser().catch(console.error);
