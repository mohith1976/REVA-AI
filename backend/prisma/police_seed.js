const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Consolidated Database Seeding (police_seed.js)...');

    const hashedPwd = await bcrypt.hash('Admin@123', 12);

    // 1. Upsert GLOBAL_ADMIN
    console.log('🌍 Upserting Global Admin...');
    await prisma.policeUser.upsert({
        where: { email: 'global_admin@reva.gov.in' },
        update: {},
        create: {
            id: uuidv4(),
            name: 'Global Administrator',
            email: 'global_admin@reva.gov.in',
            passwordHash: hashedPwd,
            role: 'GLOBAL_ADMIN',
            isActive: true,
            stationId: null
        }
    });

    // 2. Upsert Police Stations from Official APSAC Data
    console.log('📍 Seeding Official Police Stations...');
    const apsacPath = path.join(__dirname, 'seed_apsac_stations.json');
    if (fs.existsSync(apsacPath)) {
        const apsacData = JSON.parse(fs.readFileSync(apsacPath, 'utf8'));
        console.log(`📊 Found ${apsacData.length} stations in JSON.`);

        // Using a batch size to avoid overwhelming the DB
        const BATCH_SIZE = 100;
        for (let i = 0; i < apsacData.length; i += BATCH_SIZE) {
            const batch = apsacData.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(s =>
                prisma.policeStation.upsert({
                    where: { id: s.id },
                    update: {
                        stationName: s.station_name,
                        district: s.district,
                        state: s.state,
                        latitude: s.latitude,
                        longitude: s.longitude,
                        contactNumber: s.contact_number || 'NA',
                        address: s.address,
                        circleName: s.circle_name,
                        dataSource: s.data_source,
                        districtCode: s.district_code,
                        divisionName: s.division_name,
                        externalId: s.external_id,
                        parentStationId: s.parent_station_id,
                        pincode: s.pincode,
                        subDivisionName: s.sub_division_name,
                        rank: s.rank || 'STATION'
                    },
                    create: {
                        id: s.id,
                        stationName: s.station_name,
                        district: s.district,
                        state: s.state,
                        latitude: s.latitude,
                        longitude: s.longitude,
                        contactNumber: s.contact_number || 'NA',
                        address: s.address,
                        circleName: s.circle_name,
                        dataSource: s.data_source,
                        districtCode: s.district_code,
                        divisionName: s.division_name,
                        externalId: s.external_id,
                        parentStationId: s.parent_station_id,
                        pincode: s.pincode,
                        subDivisionName: s.sub_division_name,
                        rank: s.rank || 'STATION'
                    }
                })
            ));
            if (i % 500 === 0 && i > 0) console.log(`   ... processed ${i} stations`);
        }
    } else {
        console.warn('⚠️ seed_apsac_stations.json not found. Skipping station seeding.');
    }

    // 3. Create Sample Station Personnel (Bhimavaram focus)
    console.log('👮 Seeding Bhimavaram Personnel...');
    const bhimavaramStations = await prisma.policeStation.findMany({
        where: { stationName: { contains: 'Bhimavaram', mode: 'insensitive' } }
    });

    for (const station of bhimavaramStations) {
        // Admin
        const adminEmail = `admin.${station.id.toLowerCase().replace(/[^a-z0-9]/g, '.')}@police.gov.in`;
        await prisma.policeUser.upsert({
            where: { email: adminEmail },
            update: { stationId: station.id },
            create: {
                id: uuidv4(),
                stationId: station.id,
                name: `${station.stationName} Admin`,
                email: adminEmail,
                passwordHash: hashedPwd,
                role: 'STATION_ADMIN',
                isActive: true
            }
        });

        // Officers
        for (let i = 1; i <= 2; i++) {
            const officerEmail = `officer${i}.${station.id.toLowerCase().replace(/[^a-z0-9]/g, '.')}@police.gov.in`;
            await prisma.policeUser.upsert({
                where: { email: officerEmail },
                update: { stationId: station.id },
                create: {
                    id: uuidv4(),
                    stationId: station.id,
                    name: `Officer ${i} (${station.stationName})`,
                    email: officerEmail,
                    passwordHash: hashedPwd,
                    role: 'OFFICER',
                    isActive: true
                }
            });
        }
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
    console.log('GLOBAL ADMIN: global_admin@reva.gov.in / Admin@123');
    console.log('BHIMAVARAM ADMINS: check police_users table for emails starting with "admin.bhima..."');
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
