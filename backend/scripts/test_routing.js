/**
 * PostGIS Routing Test Script
 * ─────────────────────────────────────────────────────────────────
 * Tests the ST_Contains routing logic with known coordinates in AP.
 *
 * Usage:
 *   node scripts/test_routing.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test coordinates in Andhra Pradesh
const TEST_POINTS = [
    { name: 'Vijayawada City Center', lat: 16.5062, lng: 80.648 },
    { name: 'Eluru (West Godavari)', lat: 16.7107, lng: 81.0952 },
    { name: 'Bhimavaram (W. Godavari)', lat: 16.5449, lng: 81.5212 },
    { name: 'Visakhapatnam Port', lat: 17.6868, lng: 83.2185 },
    { name: 'Tirupati Old Town', lat: 13.6288, lng: 79.4192 },
];

async function testRoutingPoint(name, lat, lng) {
    // ST_Contains polygon match
    const exactMatch = await prisma.$queryRaw`
    SELECT
      station_name AS "stationName",
      district,
      circle_name AS "circleName",
      data_source AS "dataSource",
      'POLYGON_MATCH' AS "matchType"
    FROM police_stations
    WHERE
      status = TRUE
      AND boundary IS NOT NULL
      AND ST_Contains(
        boundary,
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)
      )
    LIMIT 1
  `;

    if (exactMatch && exactMatch.length > 0) {
        const s = exactMatch[0];
        console.log(`✅ ${name}`);
        console.log(`   → ${s.stationName} [${s.district}] (${s.circleName || 'No Circle'}) via ${s.dataSource}`);
        return;
    }

    // ST_Distance fallback
    const nearest = await prisma.$queryRaw`
    SELECT
      station_name AS "stationName",
      district,
      ROUND(
        (ST_Distance(
          ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)::geography
        ) / 1000.0)::numeric, 2
      ) AS "distanceKm"
    FROM police_stations
    WHERE status = TRUE
    ORDER BY
      ST_Distance(
        ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)::geography
      )
    LIMIT 1
  `;

    if (nearest && nearest.length > 0) {
        const s = nearest[0];
        console.log(`⚠️  ${name} (No polygon — fallback)`);
        console.log(`   → ${s.stationName} [${s.district}] ${s.distanceKm}km away`);
    } else {
        console.log(`❌ ${name} — No station found`);
    }
}

async function main() {
    console.log('\n🗺️  REVA AI PostGIS Routing Test');
    console.log('────────────────────────────────────────');

    for (const point of TEST_POINTS) {
        await testRoutingPoint(point.name, point.lat, point.lng);
    }

    await prisma.$disconnect();
    console.log('\n✅ Test complete');
}

main().catch(async (err) => {
    console.error('Error:', err);
    await prisma.$disconnect();
});
