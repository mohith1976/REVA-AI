/**
 * Geofence Route — Phase 3: PostGIS Routing Engine
 * ─────────────────────────────────────────────────────────────────
 * Replaces the Haversine radius-loop with a PostGIS ST_Contains query.
 * This provides centimeter-accurate, instant jurisdiction matching using
 * the official APSAC boundary polygons stored in the `boundary` column.
 *
 * GET /api/geofence/check?lat=&lng=
 */

const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/prisma');

// ─── Main Geofence Check Endpoint ────────────────────────────────────────────

router.get('/check', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Coordinates required' });

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const station = await findStationForPoint(parsedLat, parsedLng);

    if (station) {
      return res.json({
        withinGeofence: station.matchType === 'POLYGON',
        routedToDefault: station.matchType === 'NEAREST',
        station,
      });
    }

    return res.status(404).json({ error: 'No police station found for location' });
  } catch (error) {
    next(error);
  }
});

// ─── Core Routing Function (exported for reuse in complaints.js) ──────────────

/**
 * Finds the responsible police station for a given GPS coordinate.
 *
 * Strategy (in order):
 *   1. PostGIS ST_Contains — exact polygon match from official APSAC boundaries
 *   2. PostGIS ST_Distance  — nearest station by actual spatial distance
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {object|null} station record with matchType: 'POLYGON' | 'NEAREST'
 */
async function findStationForPoint(lat, lng) {
  // ── Primary: Exact polygon match using official APSAC boundaries ────────────
  const exactMatch = await prisma.$queryRaw`
    SELECT
      id,
      station_name     AS "stationName",
      district,
      state,
      latitude,
      longitude,
      radius_km        AS "radiusKm",
      contact_number   AS "contactNumber",
      circle_name      AS "circleName",
      sub_division_name AS "subDivisionName",
      division_name    AS "divisionName",
      parent_station_id AS "parentStationId",
      data_source      AS "dataSource",
      'POLYGON'        AS "matchType",
      0                AS "distanceKm"
    FROM police_stations
    WHERE
      status = TRUE
      AND boundary IS NOT NULL
      AND extensions.ST_Contains(
        boundary,
        extensions.ST_SetSRID(extensions.ST_Point(${lng}, ${lat}), 4326)
      )
    ORDER BY 
      CASE rank
        WHEN 'STATION' THEN 1
        WHEN 'CIRCLE' THEN 2
        WHEN 'SUBDIVISION' THEN 3
        WHEN 'DISTRICT' THEN 4
        ELSE 5
      END ASC
    LIMIT 1
  `;

  if (exactMatch && exactMatch.length > 0) {
    return exactMatch[0];
  }

  // ── Fallback: Nearest station by spatial distance (for unpolygoned areas) ───
  const nearestMatch = await prisma.$queryRaw`
    SELECT
      id,
      station_name     AS "stationName",
      district,
      state,
      latitude,
      longitude,
      radius_km        AS "radiusKm",
      contact_number   AS "contactNumber",
      circle_name      AS "circleName",
      sub_division_name AS "subDivisionName",
      division_name    AS "divisionName",
      parent_station_id AS "parentStationId",
      data_source      AS "dataSource",
      'NEAREST'        AS "matchType",
      ROUND(
        (extensions.ST_Distance(
          extensions.ST_SetSRID(extensions.ST_Point(longitude, latitude), 4326)::geography,
          extensions.ST_SetSRID(extensions.ST_Point(${lng}, ${lat}), 4326)::geography
        ) / 1000.0)::numeric, 2
      )                AS "distanceKm"
    FROM police_stations
    WHERE status = TRUE 
      AND latitude != 0 AND longitude != 0
    ORDER BY
      extensions.ST_Distance(
        extensions.ST_SetSRID(extensions.ST_Point(longitude, latitude), 4326)::geography,
        extensions.ST_SetSRID(extensions.ST_Point(${lng}, ${lat}), 4326)::geography
      )
    LIMIT 1
  `;

  if (nearestMatch && nearestMatch.length > 0) {
    return nearestMatch[0];
  }

  return null;
}

module.exports = router;
module.exports.findStationForPoint = findStationForPoint;
