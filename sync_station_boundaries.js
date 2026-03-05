const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Boundary Synchronization...');

    const dataPath = path.join(__dirname, '../../police_stations_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('❌ Data file not found at:', dataPath);
        process.exit(1);
    }

    const stations = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`📊 Loaded ${stations.length} stations from JSON.`);

    const withBoundary = stations.filter(s => s.boundary && s.boundary.type);
    console.log(`🗺️  Found ${withBoundary.length} stations with boundary polygons.`);

    let successCount = 0;
    let errorCount = 0;

    // Process in batches to avoid overwhelming the connection
    const BATCH_SIZE = 50;
    for (let i = 0; i < withBoundary.length; i += BATCH_SIZE) {
        const batch = withBoundary.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (s) => {
            try {
                // We use extensions.ST_GeomFromGeoJSON because the extension is in the extensions schema
                // We must ensure the input is valid GeoJSON for PostGIS
                const geoJson = JSON.stringify(s.boundary);

                // We update the record by its ID or external_id
                // The seed uses the ID from the JSON as the primary key
                await prisma.$executeRawUnsafe(
                    `UPDATE police_stations 
                     SET boundary = ST_Multi(ST_GeomFromGeoJSON($1)) 
                     WHERE id = $2 OR external_id = $3`,
                    geoJson, s.id, s.external_id || s.id
                );
                successCount++;
            } catch (err) {
                console.error(`❌ Error updating station ${s.station_name} (${s.id}):`, err.message);
                errorCount++;
            }
        }));

        if (i % 250 === 0 && i > 0) {
            console.log(`   ... processed ${i} stations`);
        }
    }

    console.log(`\n✅ Boundary Synchronization Complete!`);
    console.log(`✨ Successfully synced: ${successCount}`);
    console.log(`⚠️  Errors: ${errorCount}`);
}

main()
    .catch(err => {
        console.error('💥 Critical error:', err);
    })
    .finally(() => prisma.$disconnect());
