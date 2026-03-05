/**
 * Debug script to check user state after Aadhaar verification
 * Run this to see what's in the database for your test user
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const aadhaarMasked = 'XXXX-XXXX-9322'; // Replace with your test Aadhaar last 4 digits
  
  const user = await prisma.user.findFirst({
    where: { aadhaarMasked }
  });

  if (!user) {
    console.log('❌ User not found with Aadhaar:', aadhaarMasked);
    return;
  }

  console.log('\n📋 User Details:');
  console.log('================');
  console.log('ID:', user.id);
  console.log('Name:', user.name);
  console.log('Aadhaar Masked:', user.aadhaarMasked);
  console.log('Mobile Number:', user.mobileNumber || '❌ NOT SET');
  console.log('Registration Complete:', user.registrationComplete);
  console.log('Is Verified:', user.isVerified);
  console.log('Date of Birth:', user.dateOfBirth);
  console.log('Gender:', user.gender);
  console.log('Care Of:', user.careOf);
  console.log('Address:', user.residentialAddress);
  console.log('\n🔍 Analysis:');
  console.log('================');
  
  if (user.registrationComplete && user.mobileNumber) {
    console.log('✅ User has completed registration - will login directly');
    console.log('   Backend returns: needsPhone = false');
  } else if (!user.mobileNumber) {
    console.log('✅ User needs to register mobile number');
    console.log('   Backend should return: needsPhone = true');
  } else {
    console.log('⚠️  Inconsistent state - has mobile but registration not complete');
  }

  await prisma.$disconnect();
}

checkUser().catch(console.error);
