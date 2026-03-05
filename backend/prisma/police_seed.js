const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'seed_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Consolidated Database Seeding (police_seed.js)...');

    const hashedPwd = await bcrypt.hash(config.adminPassword, 12);

    // 1. Upsert GLOBAL_ADMIN
    console.log(`🌍 Upserting Global Admin (${config.adminEmail})...`);
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
            stationId: null
        }
    });

    // 2. Upsert Police Stations from Data File
    console.log('📍 Seeding Official Police Stations...');
    const stationDataPath = path.join(__dirname, config.stationDataPath);
    if (fs.existsSync(stationDataPath)) {
        const stationsData = JSON.parse(fs.readFileSync(stationDataPath, 'utf8'));
        console.log(`📊 Found ${stationsData.length} stations in JSON.`);

        // Using sequential upserts within batches to avoid connection pool timeouts
        const BATCH_SIZE = 100;
        for (let i = 0; i < stationsData.length; i += BATCH_SIZE) {
            const batch = stationsData.slice(i, i + BATCH_SIZE);
            for (const s of batch) {
                await prisma.policeStation.upsert({
                    where: { id: s.id },
                    update: {
                        stationName: s.stationName,
                        district: s.district,
                        state: s.state,
                        latitude: s.latitude,
                        longitude: s.longitude,
                        contactNumber: s.contactNumber || 'NA',
                        address: s.address,
                        circleName: s.circleName,
                        dataSource: s.dataSource || 'MANUAL',
                        districtCode: s.districtCode,
                        divisionName: s.divisionName,
                        externalId: s.externalId,
                        parentStationId: s.parentStationId,
                        pincode: s.pincode,
                        subDivisionName: s.subDivisionName,
                        rank: s.rank || 'STATION'
                    },
                    create: {
                        id: s.id,
                        stationName: s.stationName,
                        district: s.district,
                        state: s.state,
                        latitude: s.latitude,
                        longitude: s.longitude,
                        contactNumber: s.contactNumber || 'NA',
                        address: s.address,
                        circleName: s.circleName,
                        dataSource: s.dataSource || 'MANUAL',
                        districtCode: s.districtCode,
                        divisionName: s.divisionName,
                        externalId: s.externalId,
                        parentStationId: s.parentStationId,
                        pincode: s.pincode,
                        subDivisionName: s.subDivisionName,
                        rank: s.rank || 'STATION'
                    }
                });
            }
            if (i % 500 === 0 && i > 0) console.log(`   ... processed ${i} stations`);
        }
    } else {
        console.warn(`⚠️ ${config.stationDataPath} not found. Skipping station seeding.`);
    }

    // 3. Create Personnel for ALL Stations (Admin/Inspector per station)
    console.log('👮 Seeding Personnel for all stations...');

    // Mapping StationRank to UserRole
    const rankRoleMap = {
        'DISTRICT': 'DISTRICT_ADMIN',
        'SUBDIVISION': 'DIVISION_ADMIN',
        'CIRCLE': 'CIRCLE_ADMIN',
        'STATION': 'STATION_ADMIN'
    };

    const stations = await prisma.policeStation.findMany();
    console.log(`📊 Processing personnel for ${stations.length} stations...`);

    const PERSONNEL_BATCH_SIZE = 100;
    for (let i = 0; i < stations.length; i += PERSONNEL_BATCH_SIZE) {
        const batch = stations.slice(i, i + PERSONNEL_BATCH_SIZE);
        for (const station of batch) {
            const role = rankRoleMap[station.rank] || 'OFFICER';
            const adminEmail = `admin.${station.id.toLowerCase().replace(/[^a-z0-9]/g, '.')}@${config.policeDomain}`;

            await prisma.policeUser.upsert({
                where: { email: adminEmail },
                update: {
                    stationId: station.id,
                    role: role
                },
                create: {
                    id: uuidv4(),
                    stationId: station.id,
                    name: `${station.stationName} ${role.replace('_ADMIN', '').replace('_', ' ')}`,
                    email: adminEmail,
                    passwordHash: hashedPwd,
                    role: role,
                    isActive: true
                }
            });
        }
        if (i % 500 === 0 && i > 0) console.log(`   ... processed ${i} station personnel`);
    }

    // 4. Create Citizen Users
    console.log('👥 Upserting Citizen Users...');
    const citizenData = [
        { name: 'Rahul Sharma', mobile: '9876543210', aadhaar: 'XXXX-XXXX-1234' },
        { name: 'Priya Verma', mobile: '9888877777', aadhaar: 'XXXX-XXXX-5678' },
        { name: 'Kiran Kumar', mobile: '9999900000', aadhaar: 'XXXX-XXXX-9000' }
    ];

    for (const c of citizenData) {
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
                language: 'en'
            }
        });
    }

    console.log('\n✅ Consolidated Seeding Complete!');
    console.log('--------------------------------------------------');
    console.log(`GLOBAL ADMIN: ${config.adminEmail} / ${config.adminPassword}`);
    console.log(`OFFICER EMAIL DOMAIN: @${config.policeDomain}`);
    console.log('--------------------------------------------------');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
