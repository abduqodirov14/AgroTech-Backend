import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const SEED_CLIENT = new PrismaClient();

export async function seedDemoData(force = false) {
  try {
    // Check if data exists
    const countResult = await SEED_CLIENT.$queryRaw`SELECT COUNT(*) FROM shipments`;
    const count = Number((countResult as any)[0].count);
    
    if (count > 0 && !force) {
      return { message: 'Demo data exists', shipments: count };
    }

    // Clear existing data with raw SQL
    await SEED_CLIENT.$queryRawUnsafe('TRUNCATE TABLE shipment_tracking, shipment_documents, shipments, vehicles, drivers, warehouses, routes, logistics_cost_snapshots RESTART IDENTITY CASCADE');

    // Create drivers
    await SEED_CLIENT.$queryRawUnsafe(
      `INSERT INTO drivers (full_name, phone, telegram_id, is_verified, "status") 
       VALUES 
       ('Akmal R.', '+998901111111', 100001, true, 'AVAILABLE'),
       ('Bobur R.', '+998902222222', 100002, true, 'AVAILABLE'),
       ('Sardor K.', '+998903333333', 100003, true, 'AVAILABLE')`
    );

    // Create vehicles
    await SEED_CLIENT.$queryRawUnsafe(
      `INSERT INTO vehicles (plate_number, name, type, capacity_tons, has_refrigeration, status, fuel_percent, current_location, current_lat, current_lng) 
       VALUES 
       ('01 D 234 AB', 'Truck 10 Ton', 'REFRIGERATED', 10, true, 'AVAILABLE', 72, 'Tashkent', 41.31, 69.28),
       ('10 B 456 CD', 'Truck 20 Ton', 'TRUCK_20T', 20, true, 'AVAILABLE', 85, 'Tashkent', 41.31, 69.28),
       ('30 C 789 EF', 'Van 3 Ton', 'VAN', 3, false, 'MAINTENANCE', 40, 'Samarkand', NULL, NULL)`
    );

    // Create shipments
    await SEED_CLIENT.$queryRawUnsafe(
      `INSERT INTO shipments (track_id, origin_lat, origin_lng, origin_address, dest_lat, dest_lng, dest_address, cargo_type, weight_tons, freight_cost, status, temp_celsius, progress_percent, distance_km, eta_at) 
       VALUES 
       ('SH-2025-0387', 40.1, 65.38, 'Navoiy', 55.75, 37.62, 'Moskva', 'Gilos (20t)', 20, 4000, 'IN_TRANSIT', 2, 75, 3200, NOW() + INTERVAL '24 hours'),
       ('SH-2025-0388', 39.65, 66.96, 'Samarqand', 41.31, 69.28, 'Toshkent', 'Bug''doy (35t)', 35, 800, 'IN_TRANSIT', NULL, 60, 280, NOW() + INTERVAL '24 hours'),
       ('SH-2025-0389', 39.77, 64.42, 'Buxoro', 40.38, 71.78, 'Farg''ona', 'Pomidor (12t)', 12, 450, 'COMPLETED', 5, 100, 520, NOW() + INTERVAL '24 hours'),
       ('SH-2025-0390', 40.78, 72.34, 'Andijon', 43.24, 76.91, 'Qozog''iston', 'Uzum (8t)', 8, 600, 'PENDING_DRIVER', NULL, 0, 400, NOW() + INTERVAL '24 hours')`
    );

    // Create warehouses
    await SEED_CLIENT.$queryRawUnsafe(
      `INSERT INTO warehouses (name, region, latitude, longitude, capacity_pct, stock_value) 
       VALUES 
       ('Tashkent Hub', 'tashkent', 41.31, 69.28, 85, 45230),
       ('Fergana Depot', 'fergana', 40.38, 71.78, 62, 28100),
       ('Samarkand Storage', 'samarkand', 39.65, 66.96, 45, 21450),
       ('Andijan Cold Store', 'andijan', 40.78, 72.34, 78, 33800)`
    );

    // Create routes
    await SEED_CLIENT.$queryRawUnsafe(
      `INSERT INTO routes (origin, destination, shipment_count, avg_travel_hours, on_time_percent, distance_km) 
       VALUES 
       ('Toshkent', 'Samarqand', 48, 4.5, 96, 280),
       ('Navoiy', 'Moskva', 12, 72, 92, 3200),
       ('Buxoro', 'Farg''ona', 35, 6, 98, 520),
       ('Andijon', 'Toshkent', 28, 5, 94, 380)`
    );

    // Create cost snapshot
    await SEED_CLIENT.$queryRawUnsafe(
      `INSERT INTO logistics_cost_snapshots (period, total, fuel, transport, warehouse, other) 
       VALUES ('2026-06', 2450, 980, 735, 490, 245)`
    );

    logger.info('Logistics demo data seeded');
    return { message: 'Demo data created', shipments: 4, vehicles: 3 };
  } catch (e: any) {
    logger.error('Seed failed', { error: e.message, stack: e.stack });
    throw e;
  }
}