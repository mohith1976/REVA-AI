const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting personnel and complaints seeding (Preserving Stations)...');

    // 1. Cleanup Personnel, Complaints, Notifications, Evidence
    console.log('🧹 Cleaning up old transient data (PoliceUser, Complaint, etc.)...');
    // We do NOT delete police_stations
    await prisma.auditLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.evidence.deleteMany({});
    await prisma.complaintUpdate.deleteMany({});
    await prisma.complaint.deleteMany({});
    await prisma.policeUser.deleteMany({});
    await prisma.user.deleteMany({});

    const hashedPwd = await bcrypt.hash('Admin@123', 12);

    // 2. Create Global Admin
    console.log('🌍 Creating Global Admin...');
    await prisma.policeUser.create({
        data: {
            id: uuidv4(),
            name: 'Global Administrator',
            email: 'global_admin@reva.gov.in',
            passwordHash: hashedPwd,
            role: 'GLOBAL_ADMIN',
            isActive: true,
            stationId: null
        }
    });

    // 3. Fetch existing stations to link personnel
    const districtHQs = await prisma.policeStation.findMany({ where: { rank: 'DISTRICT' } });
    const divisions = await prisma.policeStation.findMany({ where: { rank: 'SUBDIVISION' } });
    const circles = await prisma.policeStation.findMany({ where: { rank: 'CIRCLE' } });
    const localStations = await prisma.policeStation.findMany({ where: { rank: 'STATION' } });

    console.log(`📍 Found ${districtHQs.length} Districts, ${divisions.length} Divisions, ${circles.length} Circles, ${localStations.length} Stations.`);

    // 4. Create Admins for a sample of high-level jurisdictions
    console.log('👮 Seeding Admins for Districts and Circles...');
    for (const hq of districtHQs.slice(0, 5)) {
        await prisma.policeUser.create({
            data: {
                id: uuidv4(),
                stationId: hq.id,
                name: `${hq.district} District Admin`,
                email: `admin.${hq.id.toLowerCase().replace(/_/g, '.')}@reva.gov.in`,
                passwordHash: hashedPwd,
                role: 'SUPER_ADMIN',
                isActive: true
            }
        });
    }

    for (const circle of circles.slice(0, 10)) {
        await prisma.policeUser.create({
            data: {
                id: uuidv4(),
                stationId: circle.id,
                name: `${circle.stationName} Circle Admin`,
                email: `circle.${circle.id.toLowerCase().replace(/_/g, '.')}@reva.gov.in`,
                passwordHash: hashedPwd,
                role: 'STATION_ADMIN',
                isActive: true
            }
        });
    }

    // 5. Create Officers for local stations
    console.log('🛡️ Creating Officers for local stations...');
    const officers = [];
    // Seed officers for first 50 local stations for testing
    for (const station of localStations.slice(0, 50)) {
        for (let i = 1; i <= 2; i++) {
            const officer = await prisma.policeUser.create({
                data: {
                    id: uuidv4(),
                    stationId: station.id,
                    name: `Officer ${i} (${station.stationName})`,
                    email: `officer${i}.${station.id.toLowerCase().replace(/_/g, '.')}@reva.gov.in`,
                    passwordHash: hashedPwd,
                    role: 'OFFICER',
                    isActive: true
                }
            });
            officers.push(officer);
        }
    }

    // 6. Create Citizen Users
    console.log('👥 Creating Citizen Users...');
    const citizens = [];
    const citizenData = [
        { name: 'Rahul Sharma', mobile: '9876543210', aadhaar: 'XXXX-XXXX-1234' },
        { name: 'Priya Verma', mobile: '9888877777', aadhaar: 'XXXX-XXXX-5678' },
        { name: 'Kiran Kumar', mobile: '9999900000', aadhaar: 'XXXX-XXXX-9000' }
    ];

    for (const c of citizenData) {
        const user = await prisma.user.create({
            data: {
                id: uuidv4(),
                name: c.name,
                mobileNumber: c.mobile,
                aadhaarMasked: c.aadhaar,
                internalRef: uuidv4(),
                isVerified: true,
                language: 'en'
            }
        });
        citizens.push(user);
    }

    // 7. Create Sample Complaints
    console.log('📋 Generating Sample Complaints across AP...');
    const incidentTypes = ['Theft', 'Public Nuisance', 'Traffic Violation', 'Cyber Crime', 'Missing Person'];
    const statuses = ['FILED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

    for (let i = 1; i <= 60; i++) {
        const station = localStations[Math.floor(Math.random() * 100)]; // Random station from first 100
        const user = citizens[Math.floor(Math.random() * citizens.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        let assignedOfficerId = null;
        if (status !== 'FILED' && status !== 'UNDER_REVIEW') {
            const stationOfficers = officers.filter(o => o.stationId === station.id);
            if (stationOfficers.length > 0) {
                assignedOfficerId = stationOfficers[Math.floor(Math.random() * stationOfficers.length)].id;
            }
        }

        await prisma.complaint.create({
            data: {
                id: uuidv4(),
                trackingId: `REV-2026-${1000 + i}`,
                userId: user.id,
                stationId: station.id,
                assignedOfficerId,
                status,
                incidentType: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
                priorityLevel: i % 5 === 0 ? 'EMERGENCY' : (i % 3 === 0 ? 'HIGH' : 'MODERATE'),
                summaryText: `Sample report #${i}. This incident was reported in ${station.stationName}. Auto-routed via PostGIS.`,
                locationLat: station.latitude + (Math.random() - 0.5) * 0.05,
                locationLng: station.longitude + (Math.random() - 0.5) * 0.05,
                isEmergency: i % 10 === 0,
                legalConfirmed: true
            }
        });
    }

    console.log('\n✅ Seeding complete!');
    console.log('--------------------------------------------------');
    console.log('GLOBAL ADMIN: global_admin@reva.gov.in / Admin@123');
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
