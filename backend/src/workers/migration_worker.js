/**
 * Hierarchy Migration Worker — Phase 4 (Automated Escalation)
 * ─────────────────────────────────────────────────────────────────
 * Uses BullMQ to scan stale complaints and automatically escalate
 * them up the official AP Police hierarchy (Station → District HQ).
 *
 * SLA Thresholds:
 *   EMERGENCY  → 2 hours
 *   HIGH       → 12 hours
 *   MODERATE   → 24 hours
 *   INFO       → 72 hours
 *
 * Run:
 *   node src/workers/migration_worker.js
 *
 * The cron is also registered as a repeatable BullMQ job (runs every 30 min).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Queue, Worker, QueueScheduler } = require('bullmq');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── Redis Connection ─────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = { url: REDIS_URL };

// ─── SLA Config (in milliseconds) ────────────────────────────────────────────
const SLA_MS = {
    EMERGENCY: 2 * 60 * 60 * 1000,  // 2h
    HIGH: 12 * 60 * 60 * 1000,  // 12h
    MODERATE: 24 * 60 * 60 * 1000,  // 24h
    INFORMATIONAL: 72 * 60 * 60 * 1000,  // 72h
};

// ─── Queue Setup ──────────────────────────────────────────────────────────────
const migrationQueue = new Queue('complaint-migration', { connection });

/**
 * Register a repeatable job that runs every 30 minutes.
 * Call this once when the server starts.
 */
async function scheduleMigrationPulse() {
    await migrationQueue.add(
        'scan-stale-complaints',
        {},
        {
            repeat: { every: 30 * 60 * 1000 }, // every 30 minutes
            removeOnComplete: true,
            removeOnFail: 50,
        }
    );
    console.log('[MigrationWorker] Scheduled escalation pulse every 30 minutes');
}

// ─── Worker Logic ─────────────────────────────────────────────────────────────
const worker = new Worker(
    'complaint-migration',
    async (job) => {
        console.log(`[MigrationWorker] Running escalation scan at ${new Date().toISOString()}`);

        const now = new Date();
        let escalated = 0;

        for (const [priority, slaMs] of Object.entries(SLA_MS)) {
            const cutoff = new Date(now.getTime() - slaMs);

            // Find complaints that:
            // - have the matching priority
            // - were created or last migrated BEFORE the SLA cutoff
            // - are NOT yet resolved/closed/rejected
            // - have a parent station to escalate to
            const staleComplaints = await prisma.complaint.findMany({
                where: {
                    priorityLevel: priority,
                    status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] },
                    station: { parentStationId: { not: null } },
                    OR: [
                        { lastMigratedAt: null, createdAt: { lte: cutoff } },
                        { lastMigratedAt: { lte: cutoff } },
                    ],
                },
                include: {
                    station: { select: { parentStationId: true, stationName: true } },
                },
                take: 100, // process in batches
            });

            for (const complaint of staleComplaints) {
                const targetStation = await prisma.policeStation.findUnique({
                    where: { id: complaint.station.parentStationId },
                    select: { id: true, stationName: true, rank: true }
                });

                if (!targetStation) continue;

                await prisma.complaint.update({
                    where: { id: complaint.id },
                    data: {
                        stationId: targetStation.id,
                        status: 'ESCALATED',
                        migrationCount: { increment: 1 },
                        lastMigratedAt: now,
                    },
                });

                // Log the escalation event with rank details
                const fromRank = complaint.station.rank || 'STATION';
                const toRank = targetStation.rank;

                await prisma.complaintUpdate.create({
                    data: {
                        complaintId: complaint.id,
                        updatedBy: 'SYSTEM_MIGRATION_WORKER',
                        updateType: 'ESCALATION',
                        content: `Auto-escalated from ${fromRank} level ("${complaint.station.stationName}") to ${toRank} level ("${targetStation.stationName}") due to ${priority} priority SLA breach (${slaMs / 3600000}h).`,
                    },
                });

                escalated++;
            }
        }

        console.log(`[MigrationWorker] Escalated ${escalated} complaint(s)`);
    },
    { connection }
);

worker.on('completed', (job) => {
    console.log(`[MigrationWorker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`[MigrationWorker] Job ${job?.id} failed:`, err.message);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
    await scheduleMigrationPulse();
    console.log('[MigrationWorker] Worker started and listening...');
})();

module.exports = { migrationQueue, scheduleMigrationPulse };
