const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/prisma');
const { authenticatePolice, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// GET /api/stations - Public endpoint to list active stations
router.get('/', async (req, res, next) => {
  try {
    const { rank, search, page, limit } = req.query;

    // Default to pagination if either 'page' or 'limit' is provided
    // Otherwise, default to a large limit (2000) for map/all stations
    const isPaginated = page !== undefined || limit !== undefined;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 2000;
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `FROM police_stations WHERE status = true`;
    const params = [];
    let paramIdx = 1;

    if (rank) {
      baseQuery += ` AND rank::text = $${paramIdx++}`;
      params.push(rank);
    }

    if (search) {
      baseQuery += ` AND (station_name ILIKE $${paramIdx} OR district ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*)::int as count ${baseQuery}`;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
    const totalCount = countResult[0].count;

    // Get data
    const dataQuery = `
      SELECT 
        id, 
        station_name as "stationName", 
        district, 
        state, 
        latitude, 
        longitude, 
        radius_km as "radiusKm", 
        contact_number as "contactNumber",
        parent_station_id as "parentStationId",
        external_id as "externalId",
        rank,
        extensions.ST_AsGeoJSON(boundary)::json as boundary
      ${baseQuery}
      ORDER BY station_name ASC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const stations = await prisma.$queryRawUnsafe(dataQuery, ...params, limitNum, offset);

    res.json({
      stations,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
        isPaginated
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/stations - GLOBAL_ADMIN creates station
router.post('/', authenticatePolice, requireRole('GLOBAL_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { stationName, district, state, latitude, longitude, radiusKm, contactNumber } = req.body;

    const station = await prisma.policeStation.create({
      data: {
        stationName,
        district,
        state,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusKm: parseFloat(radiusKm) || 5,
        contactNumber
      },
    });

    res.status(201).json({ message: 'Station created successfully', station });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/stations/:id - Update station (Geofence, Status, Info)
router.patch('/:id', authenticatePolice, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stationName, district, state, latitude, longitude, radiusKm, contactNumber, status } = req.body;

    // STATION_ADMIN can only update their own station
    if (req.policeUser.role === 'STATION_ADMIN' && req.policeUser.stationId !== id) {
      throw new AppError('Unauthorized: Station Admin can only update their own station', 403, 'FORBIDDEN');
    }

    // Only high roles can update
    if (!['GLOBAL_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN'].includes(req.policeUser.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const updateData = {};
    if (stationName) updateData.stationName = stationName;
    if (district) updateData.district = district;
    if (state) updateData.state = state;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (radiusKm !== undefined) updateData.radiusKm = parseFloat(radiusKm);
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (status !== undefined) updateData.status = !!status;

    const updated = await prisma.policeStation.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: 'Station updated successfully', station: updated });
  } catch (error) {
    next(error);
  }
});

const { findStationForPoint } = require('./geofence');

// GET /api/stations/nearest?lat=&lng=
router.get('/nearest', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) throw new AppError('Coordinates required', 400, 'MISSING_COORDS');

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      throw new AppError('Invalid coordinates', 400, 'INVALID_COORDS');
    }

    const station = await findStationForPoint(parsedLat, parsedLng);

    if (station) {
      res.json({
        station,
        withinGeofence: station.matchType === 'POLYGON',
        routedToDefault: station.matchType === 'NEAREST',
        distanceKm: station.distanceKm
      });
    } else {
      res.status(404).json({ error: 'No police station found for location' });
    }
  } catch (error) {
    next(error);
  }
});

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;
