import { Router, Request, Response } from 'express';
import prisma from '../infrastructure/database/prisma';
import { logger } from '../utils/logger';

const router = Router();

/**
 * DRIVER PUBLIC PAGE - No authentication required
 * Driver accesses via unique SMS link: https://agrohub.uz/driver-page/{trackId}
 */

router.get('/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;

    const shipment = await prisma.shipment.findUnique({
      where: { trackId },
      include: {
        driver: true,
        vehicle: true,
        trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });

    if (!shipment) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Shipment Not Found</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Shipment Not Found</h1>
          <p>Tracking ID: ${trackId}</p>
        </body>
        </html>
      `);
    }

    const currentLat =
      shipment.trackingPoints.length > 0
        ? shipment.trackingPoints[0].lat
        : shipment.originLat;
    const currentLng =
      shipment.trackingPoints.length > 0
        ? shipment.trackingPoints[0].lng
        : shipment.originLng;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pickup & Delivery - ${shipment.trackId}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
          .header {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header h1 { font-size: 28px; margin-bottom: 5px; }
          .track-id { font-size: 14px; opacity: 0.9; }
          .container { max-width: 1000px; margin: 20px auto; padding: 0 15px; }
          .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          @media (max-width: 768px) { .content-grid { grid-template-columns: 1fr; } }
          
          .card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
          }
          .card-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; border-bottom: 2px solid #2ecc71; padding-bottom: 10px; }
          
          .map-container { 
            width: 100%;
            height: 400px;
            border-radius: 8px;
            overflow: hidden;
            grid-column: 1 / -1;
          }
          #map { width: 100%; height: 100%; }
          
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 12px 0; 
            border-bottom: 1px solid #eee;
          }
          .info-label { font-weight: 600; color: #555; }
          .info-value { color: #333; }
          
          .location-box {
            background: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #2ecc71;
            margin: 10px 0;
            border-radius: 4px;
          }
          .location-label { font-size: 12px; color: #999; text-transform: uppercase; }
          .location-address { font-size: 16px; font-weight: 600; color: #333; margin-top: 5px; }
          
          .qr-code { text-align: center; margin: 20px 0; }
          .qr-code img { max-width: 200px; border: 2px solid #ddd; padding: 10px; background: white; }
          
          .status-badge {
            display: inline-block;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
          }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-transit { background: #cfe2ff; color: #084298; }
          .status-delivered { background: #d1e7dd; color: #0f5132; }
          .status-alert { background: #f8d7da; color: #842029; }
          
          .button {
            background: #2ecc71;
            color: white;
            border: none;
            padding: 12px 30px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px 5px;
            transition: background 0.3s;
          }
          .button:hover { background: #27ae60; }
          .button-secondary { background: #3498db; }
          .button-secondary:hover { background: #2980b9; }
          .button-danger { background: #e74c3c; }
          .button-danger:hover { background: #c0392b; }
          
          .alert {
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid;
          }
          .alert-danger { background: #f8d7da; border-color: #f5c6cb; color: #842029; }
          .alert-info { background: #d1ecf1; border-color: #bee5eb; color: #0c5460; }
          
          .document-list { list-style: none; }
          .document-list li {
            padding: 10px;
            background: #f9f9f9;
            margin: 5px 0;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚚 Delivery Instructions</h1>
          <div class="track-id">Tracking ID: ${shipment.trackId}</div>
        </div>

        <div class="container">
          <!-- MAP -->
          <div class="card map-container">
            <div id="map"></div>
          </div>

          <!-- LOCATIONS -->
          <div class="content-grid">
            <div class="card">
              <div class="card-title">📍 PICKUP LOCATION</div>
              <div class="location-box">
                <div class="location-label">Pickup from:</div>
                <div class="location-address">${shipment.originAddress}</div>
              </div>
              <div style="color: #999; font-size: 12px;">
                Coordinates: ${shipment.originLat.toFixed(4)}, ${shipment.originLng.toFixed(4)}
              </div>
            </div>

            <div class="card">
              <div class="card-title">🏢 DELIVERY LOCATION</div>
              <div class="location-box">
                <div class="location-label">Deliver to:</div>
                <div class="location-address">${shipment.destAddress}</div>
              </div>
              <div style="color: #999; font-size: 12px;">
                Coordinates: ${shipment.destLat.toFixed(4)}, ${shipment.destLng.toFixed(4)}
              </div>
            </div>
          </div>

          <!-- SHIPMENT INFO -->
          <div class="card">
            <div class="card-title">📦 CARGO INFORMATION</div>
            <div class="info-row">
              <span class="info-label">Cargo Type:</span>
              <span class="info-value">${shipment.cargoType}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Weight:</span>
              <span class="info-value">${shipment.weightTons} tons</span>
            </div>
            <div class="info-row">
              <span class="info-label">Temperature Range:</span>
              <span class="info-value">${shipment.tempMaxAllowed - 2}°C to ${shipment.tempMaxAllowed}°C</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value">
                <span class="status-badge status-${shipment.status.toLowerCase()}">${shipment.status}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Freight Cost:</span>
              <span class="info-value">${shipment.freightCost} ${shipment.currency}</span>
            </div>
          </div>

          ${
            shipment.status === 'COLD_CHAIN_ALERT'
              ? `
            <div class="alert alert-danger">
              <strong>⚠️ WARNING:</strong> Cold chain temperature violation detected!
              Current temperature: ${shipment.tempCelsius}°C (Max allowed: ${shipment.tempMaxAllowed}°C)
              Contact support immediately!
            </div>
          `
              : ''
          }

          <!-- ACTIONS -->
          <div class="card">
            <div class="card-title">✅ DELIVERY ACTIONS</div>
            <p style="margin-bottom: 15px; color: #666;">
              Click the appropriate button to update shipment status:
            </p>
            <div style="text-align: center;">
              <button class="button button-secondary" onclick="confirmPickup()">
                ✓ Pickup Complete
              </button>
              <button class="button" onclick="confirmDelivery()">
                ✓ Delivery Complete
              </button>
              <button class="button button-danger" onclick="reportIssue()">
                ⚠️ Report Issue
              </button>
            </div>
          </div>

          <!-- DOCUMENTS -->
          <div class="card">
            <div class="card-title">📄 REQUIRED DOCUMENTS</div>
            <ul class="document-list">
              <li>
                <span>📋 International Waybill (CMR)</span>
                <a href="/api/v1/logistics/shipments/${shipment.trackId}/waybill" target="_blank">
                  View → 
                </a>
              </li>
              <li>
                <span>🛂 Customs Declaration</span>
                <span style="color: #999;">Included in waybill ↑</span>
              </li>
              <li>
                <span>✅ Phytosanitary Certificate</span>
                <span style="color: #999;">Included in waybill ↑</span>
              </li>
              <li>
                <span>🔐 Insurance Document</span>
                <span style="color: #999;">Included in waybill ↑</span>
              </li>
            </ul>
          </div>

          <div class="footer">
            <p>AgroHub Logistics | No login required | Real-time tracking enabled</p>
            <p>Questions? Contact support@agrohub.uz</p>
          </div>
        </div>

        <script>
          const ORIGIN = [${shipment.originLat}, ${shipment.originLng}];
          const DEST = [${shipment.destLat}, ${shipment.destLng}];
          const CURRENT = [${currentLat}, ${currentLng}];

          // Initialize map
          const map = L.map('map').setView([${(shipment.originLat + shipment.destLat) / 2}, ${(shipment.originLng + shipment.destLng) / 2}], 8);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Add markers
          L.circleMarker(ORIGIN, { color: 'green', radius: 8 }).addTo(map).bindPopup('📍 Pickup');
          L.circleMarker(DEST, { color: 'red', radius: 8 }).addTo(map).bindPopup('🏢 Delivery');
          L.marker(CURRENT, { title: 'Current' }).addTo(map).bindPopup('🚗 Current Location');

          // Draw route
          L.polyline([ORIGIN, DEST], { color: 'blue', weight: 3, opacity: 0.7 }).addTo(map);

          function confirmPickup() {
            alert('✅ Pickup confirmed! Status updated.');
            // Send API request in production
          }

          function confirmDelivery() {
            alert('✅ Delivery confirmed! All documents archived.');
            // Send API request in production
          }

          function reportIssue() {
            const issue = prompt('Describe the issue:');
            if (issue) alert('⚠️ Issue reported: ' + issue);
          }
        </script>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    logger.info('Driver page viewed', { trackId });
  } catch (error) {
    logger.error('Driver page error', { error });
    res.status(500).send('<h1>Error</h1>');
  }
});

export default router;
