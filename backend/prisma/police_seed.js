/**
 * police_seed.js — Fast, Production-Ready Database Seeder
 * ---------------------------------------------------------
 * Safe for EMPTY databases and re-runs (idempotent upserts).
 * Uses concurrent Promise.all within batches for speed.
 *
 * Sections:
 *  1. Global Admin
 *  2. Police Stations — Pass 1 (base data, no FK parent links)
 *  3. Police Stations — Pass 2 (link parentStationId hierarchy)
 *  4. Police Users    — 1 per station, role from rank
 *  5. Sample Citizen Users
 *
 * Config: prisma/seed_config.json (no hardcoded values)
 * Run:    node prisma/police_seed.js
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const configPath = path.join(__dirname, 'seed_config.json');
if (!fs.existsSync(configPath)) {
    console.error('❌ seed_config.json not found at', configPath);
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

for (const field of ['adminEmail', 'adminPassword', 'policeDomain', 'stationDataPath']) {
    if (!config[field]) {
        console.error(`❌ Missing "${field}" in seed_config.json`);
        process.exit(1);
    }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const RANK_TO_ROLE = {
    DISTRICT: 'DISTRICT_ADMIN',
    SUBDIVISION: 'DIVISION_ADMIN',
    CIRCLE: 'CIRCLE_ADMIN',
    STATION: 'STATION_ADMIN',
};

const RANK_LABEL = {
    DISTRICT: 'District Admin',
    SUBDIVISION: 'Division Admin',
    CIRCLE: 'Circle Inspector',
    STATION: 'Station Admin',
};

const CONCURRENCY = 20; // concurrent queries per batch — tuned for Supabase

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

function stationEmail(id) {
    return `admin.${id.toLowerCase().replace(/[^a-z0-9]/g, '.')}@${config.policeDomain}`;
}

/**
 * Runs handler() on every item concurrently CONCURRENCY-at-a-time.
 * Much faster than sequential, but won't flood the connection pool.
 */
async function runConcurrent(items, handler) {
    for (let i = 0; i < items.length; i += CONCURRENCY) {
        await Promise.all(items.slice(i, i + CONCURRENCY).map(handler));
    }
}

function stationUpsertData(s, includeParent = false) {
    const base = {
        stationName: s.stationName,
        district: s.district,
        state: s.state,
        latitude: s.latitude ?? 0,
        longitude: s.longitude ?? 0,
        contactNumber: s.contactNumber ?? 'NA',
        address: s.address ?? null,
        pincode: s.pincode ?? null,
        circleName: s.circleName ?? null,
        subDivisionName: s.subDivisionName ?? null,
        divisionName: s.divisionName ?? null,
        districtCode: s.districtCode ?? null,
        externalId: s.externalId ?? null,
        dataSource: s.dataSource ?? 'MANUAL',
        rank: s.rank ?? 'STATION',
        status: s.status ?? true,
    };
    if (includeParent) base.parentStationId = s.parentStationId ?? null;
    return base;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🚀 REVA-AI Database Seeding (Fast Mode)\n');
    const t0 = Date.now();

    const hashedPwd = await bcrypt.hash(config.adminPassword, 12);

    // ── 1. Global Admin ───────────────────────────────────────────────────────
    process.stdout.write('👤 Global Admin ... ');
    await prisma.policeUser.upsert({
        where: { email: config.adminEmail },
        update: {},
        create: {
            id: uuidv4(),
            name: 'Global Administrator',
            email: config.adminEmail,
            passwordHash: hashedPwd,
            role: 'GLOBAL_ADMIN',
            isActive: true,
            stationId: null,
        },
    });
    console.log('done');

    // ── 2–4. Stations & Users ─────────────────────────────────────────────────
    const dataPath = path.resolve(__dirname, config.stationDataPath);
    if (!fs.existsSync(dataPath)) {
        console.warn(`⚠️  ${dataPath} not found — skipping stations & users.`);
    } else {
        const stations = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log(`🏛️  ${stations.length} stations loaded from JSON\n`);

        // ── Pass 1: base data (no parentStationId) ────────────────────────────
        const t1 = Date.now();
        process.stdout.write(`   📥 Pass 1 — base records (${stations.length}) ... `);
        await runConcurrent(stations, (s) =>
            prisma.policeStation.upsert({
                where: { id: s.id },
                update: stationUpsertData(s, false),
                create: { id: s.id, ...stationUpsertData(s, false) },
            })
        );
        console.log(`done  (${((Date.now() - t1) / 1000).toFixed(1)}s)`);

        // ── Pass 2: link hierarchies ───────────────────────────────────────────
        const withParent = stations.filter(s => s.parentStationId);
        const t2 = Date.now();
        process.stdout.write(`   🔗 Pass 2 — hierarchy links (${withParent.length}) ... `);
        await runConcurrent(withParent, (s) =>
            prisma.policeStation.update({
                where: { id: s.id },
                data: { parentStationId: s.parentStationId },
            })
        );
        console.log(`done  (${((Date.now() - t2) / 1000).toFixed(1)}s)`);

        // ── Police Users (1 per station) ───────────────────────────────────────
        const t3 = Date.now();
        process.stdout.write(`\n👮 Police Users (${stations.length}) ... `);

        // eagerly build upsert data from JSON (avoid extra DB query)
        await runConcurrent(stations, (s) => {
            const role = RANK_TO_ROLE[s.rank] ?? 'OFFICER';
            const label = RANK_LABEL[s.rank] ?? 'Station Admin';
            const email = stationEmail(s.id);
            return prisma.policeUser.upsert({
                where: { email },
                update: { stationId: s.id, role },
                create: {
                    id: uuidv4(),
                    stationId: s.id,
                    name: `${label} — ${s.stationName}`,
                    email,
                    passwordHash: hashedPwd,
                    role,
                    isActive: true,
                },
            });
        });
        console.log(`done  (${((Date.now() - t3) / 1000).toFixed(1)}s)`);
    }

    // ── 5. Sample Citizens ────────────────────────────────────────────────────
    process.stdout.write('\n👥 Sample citizens ... ');
    const citizens = [
        { name: 'Rahul Sharma', mobile: '9876543210', aadhaar: 'XXXX-XXXX-1234' },
        { name: 'Priya Verma', mobile: '9888877777', aadhaar: 'XXXX-XXXX-5678' },
        { name: 'Kiran Kumar', mobile: '9999900000', aadhaar: 'XXXX-XXXX-9000' },
    ];
    for (const c of citizens) {
        await prisma.user.upsert({
            where: { mobileNumber: c.mobile },
            update: { name: c.name, aadhaarMasked: c.aadhaar },
            create: {
                id: uuidv4(),
                name: c.name,
                mobileNumber: c.mobile,
                aadhaarMasked: c.aadhaar,
                internalRef: uuidv4(),
                isVerified: true,
                language: 'en',
            },
        });
    }
    console.log('done');

    // ── Summary ───────────────────────────────────────────────────────────────
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`
✅ Seeding complete in ${elapsed}s
═══════════════════════════════════════════
  Global Admin : ${config.adminEmail}
  Password     : ${config.adminPassword}  (all users)
  Login email  : admin.[station-id]@${config.policeDomain}
═══════════════════════════════════════════
`);
}

main()
    .catch((err) => {
        console.error('\n❌ Seeding failed:', err.message ?? err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
