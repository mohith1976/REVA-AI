const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createGlobalAdmin() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('🔗 Connected to database.');

        const email = 'global_admin@reva.gov.in';
        const password = 'Admin@123';
        const name = 'Global Administrator';
        const role = 'GLOBAL_ADMIN';
        const id = uuidv4();

        const passwordHash = await bcrypt.hash(password, 12);

        const query = `
      INSERT INTO police_users (id, name, email, password_hash, role, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW())
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, 
          role = EXCLUDED.role,
          is_active = true
    `;

        await client.query(query, [id, name, email, passwordHash, role]);
        console.log(`✅ Global Admin account created/updated: ${email}`);

    } catch (error) {
        console.error('❌ Error creating global admin:', error);
    } finally {
        await client.end();
    }
}

createGlobalAdmin();
