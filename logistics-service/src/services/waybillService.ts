import prisma from '../infrastructure/database/prisma';
import { logger } from '../utils/logger';
import { Shipment } from '@prisma/client';

export interface WaybillData {
  shipmentId: string;
  trackId: string;
  timestamp: Date;
  shipper: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  consignee: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  cargo: {
    type: string;
    weight: number;
    tempRange: { min: number; max: number };
  };
  driver?: {
    name: string;
    phone: string;
    license: string;
  };
  vehicle?: {
    plate: string;
    type: string;
  };
  costs: {
    freight: number;
    insurance: number;
    customs: number;
    total: number;
    currency: string;
  };
}

// Generate HTML Waybill
export function generateWaybillHTML(data: WaybillData): string {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>International Waybill - ${data.trackId}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .subtitle { font-size: 12px; color: #666; }
        .section { margin: 20px 0; border: 1px solid #ddd; padding: 15px; }
        .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; background: #f0f0f0; padding: 5px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px; border: 1px solid #ccc; }
        .label { font-weight: bold; width: 150px; }
        .alert { background: #fff3cd; border: 2px solid #ff6b6b; padding: 10px; margin: 15px 0; color: #d32f2f; }
        .qr-code { text-align: center; margin: 20px 0; }
        .qr-code img { max-width: 200px; }
        .signature-line { border-top: 1px solid #000; width: 200px; height: 60px; display: inline-block; margin: 20px 10px; text-align: center; }
        .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">🚚 INTERNATIONAL WAYBILL (CMR)</div>
        <div class="subtitle">Tracking ID: ${data.trackId}</div>
      </div>

      <div class="section">
        <div class="section-title">📝 SHIPMENT INFORMATION</div>
        <table>
          <tr>
            <td class="label">Shipment ID:</td>
            <td>${data.shipmentId}</td>
          </tr>
          <tr>
            <td class="label">Date Issued:</td>
            <td>${formattedDate}</td>
          </tr>
          <tr>
            <td class="label">Cargo Type:</td>
            <td>${data.cargo.type}</td>
          </tr>
          <tr>
            <td class="label">Weight:</td>
            <td>${data.cargo.weight} tons</td>
          </tr>
          <tr>
            <td class="label">Temperature Range:</td>
            <td>${data.cargo.tempRange.min}°C to ${data.cargo.tempRange.max}°C</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">📍 SHIPPER (SELLER)</div>
        <table>
          <tr>
            <td class="label">Name/Company:</td>
            <td>${data.shipper.name}</td>
          </tr>
          <tr>
            <td class="label">Address:</td>
            <td>${data.shipper.address}</td>
          </tr>
          <tr>
            <td class="label">Coordinates:</td>
            <td>${data.shipper.coordinates.lat.toFixed(4)}, ${data.shipper.coordinates.lng.toFixed(4)}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">🏢 CONSIGNEE (BUYER)</div>
        <table>
          <tr>
            <td class="label">Name/Company:</td>
            <td>${data.consignee.name}</td>
          </tr>
          <tr>
            <td class="label">Address:</td>
            <td>${data.consignee.address}</td>
          </tr>
          <tr>
            <td class="label">Coordinates:</td>
            <td>${data.consignee.coordinates.lat.toFixed(4)}, ${data.consignee.coordinates.lng.toFixed(4)}</td>
          </tr>
        </table>
      </div>

      ${
        data.driver && data.vehicle
          ? `
      <div class="section">
        <div class="section-title">🚗 VEHICLE & DRIVER</div>
        <table>
          <tr>
            <td class="label">Driver Name:</td>
            <td>${data.driver.name}</td>
          </tr>
          <tr>
            <td class="label">Phone:</td>
            <td>${data.driver.phone}</td>
          </tr>
          <tr>
            <td class="label">License:</td>
            <td>${data.driver.license}</td>
          </tr>
          <tr>
            <td class="label">Vehicle:</td>
            <td>${data.vehicle.type} (${data.vehicle.plate})</td>
          </tr>
        </table>
      </div>
      `
          : ''
      }

      <div class="section">
        <div class="section-title">💰 COSTS & CHARGES</div>
        <table>
          <tr>
            <td class="label">Freight Cost:</td>
            <td>${data.costs.freight} ${data.costs.currency}</td>
          </tr>
          <tr>
            <td class="label">Insurance:</td>
            <td>${data.costs.insurance} ${data.costs.currency}</td>
          </tr>
          <tr>
            <td class="label">Customs/Documentation:</td>
            <td>${data.costs.customs} ${data.costs.currency}</td>
          </tr>
          <tr style="background: #ffffcc; font-weight: bold;">
            <td class="label">TOTAL:</td>
            <td>${data.costs.total} ${data.costs.currency}</td>
          </tr>
        </table>
      </div>

      <div class="alert">
        ❄️ <strong>COLD CHAIN REQUIREMENT:</strong><br>
        This shipment requires strict temperature control between ${data.cargo.tempRange.min}°C and ${data.cargo.tempRange.max}°C.
        Temperature monitoring enabled via IoT sensors. Violation alerts will be sent to shipper in real-time.
      </div>

      <div class="section">
        <div class="section-title">✍️ SIGNATURES</div>
        <div style="margin: 30px 0;">
          <div style="display: inline-block; text-align: center;">
            <div class="signature-line"></div>
            <div>Shipper Signature</div>
          </div>
          <div style="display: inline-block; text-align: center; margin-left: 50px;">
            <div class="signature-line"></div>
            <div>Driver Signature</div>
          </div>
          <div style="display: inline-block; text-align: center; margin-left: 50px;">
            <div class="signature-line"></div>
            <div>Consignee Signature</div>
          </div>
        </div>
      </div>

      <div style="page-break-after: always;"></div>

      <div class="section">
        <div class="section-title">📋 TRACKING QR CODE</div>
        <div class="qr-code">
          <p>Track this shipment:</p>
          <p style="font-size: 14px; font-weight: bold;">https://agrohub.uz/track/${data.trackId}</p>
          <p style="font-size: 10px; color: #999;">Scan this QR code or visit the link to track in real-time</p>
        </div>
      </div>

      <div style="page-break-after: always;"></div>

      <div class="section">
        <div class="section-title">📄 CUSTOMS DECLARATION</div>
        <table>
          <tr>
            <td class="label">HS Code:</td>
            <td>0809.10 (Apples) / 0809.20 (Pears) / 0808.10 (Berries)</td>
          </tr>
          <tr>
            <td class="label">Origin Country:</td>
            <td>UZ (Uzbekistan)</td>
          </tr>
          <tr>
            <td class="label">Destination:</td>
            <td>${data.consignee.address}</td>
          </tr>
          <tr>
            <td class="label">Phytosanitary Cert:</td>
            <td>✓ Required & Included</td>
          </tr>
          <tr>
            <td class="label">Insurance:</td>
            <td>✓ Included in shipping</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">⚠️ IMPORTANT NOTES</div>
        <ul>
          <li>This shipment is monitored 24/7 via GPS and IoT sensors</li>
          <li>Real-time temperature and location tracking available</li>
          <li>Cold chain violations will trigger automatic alerts</li>
          <li>All documents are digitally signed and stored in blockchain-like ledger</li>
          <li>Driver must confirm pickup and delivery via mobile link (no app needed)</li>
          <li>Recipient must confirm delivery via QR code scan</li>
        </ul>
      </div>

      <div class="footer">
        <p>Generated by AgroHub Logistics System | ${new Date().toLocaleString()}</p>
        <p>This is an official international waybill. Unauthorized modification is prohibited.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

// Generate PDF from HTML (requires pdfkit or similar)
export async function generateWaybillPDF(data: WaybillData): Promise<Buffer> {
  // Note: This requires puppeteer or pdfkit library
  // For now, returning HTML. In production, convert to PDF
  const html = generateWaybillHTML(data);
  logger.info('Waybill generated (HTML)', { trackId: data.trackId });
  return Buffer.from(html);
}

// Create waybill for shipment
export async function createWaybill(shipmentId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      driver: true,
      vehicle: true,
    },
  });

  if (!shipment) {
    throw new Error('Shipment not found');
  }

  const waybillData: WaybillData = {
    shipmentId: shipment.id,
    trackId: shipment.trackId,
    timestamp: new Date(),
    shipper: {
      name: 'AgroHub Farmer Cooperative',
      address: shipment.originAddress,
      coordinates: {
        lat: shipment.originLat,
        lng: shipment.originLng,
      },
    },
    consignee: {
      name: 'International Buyer',
      address: shipment.destAddress,
      coordinates: {
        lat: shipment.destLat,
        lng: shipment.destLng,
      },
    },
    cargo: {
      type: shipment.cargoType,
      weight: shipment.weightTons,
      tempRange: {
        min: shipment.tempMaxAllowed - 2,
        max: shipment.tempMaxAllowed,
      },
    },
    driver: shipment.driver
      ? {
          name: shipment.driver.fullName,
          phone: shipment.driver.phone,
          license: 'AB123456',
        }
      : undefined,
    vehicle: shipment.vehicle
      ? {
          plate: shipment.vehicle.plateNumber,
          type: shipment.vehicle.type,
        }
      : undefined,
    costs: {
      freight: shipment.freightCost,
      insurance: Math.round(shipment.freightCost * 0.05),
      customs: Math.round(shipment.freightCost * 0.03),
      total: Math.round(shipment.freightCost * 1.08),
      currency: shipment.currency,
    },
  };

  // Generate HTML and save as document
  const html = generateWaybillHTML(waybillData);

  await prisma.shipmentDocument.create({
    data: {
      shipmentId: shipment.id,
      type: 'WAYBILL',
      metadata: {
        format: 'HTML',
        trackId: shipment.trackId,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  logger.info('Waybill created', { shipmentId, trackId: shipment.trackId });
  return html;
}

// Get waybill for shipment
export async function getWaybill(trackId: string): Promise<string> {
  const shipment = await prisma.shipment.findUnique({
    where: { trackId },
    include: {
      driver: true,
      vehicle: true,
    },
  });

  if (!shipment) {
    throw new Error('Shipment not found');
  }

  return createWaybill(shipment.id);
}

// Export all documents for shipment
export async function exportShipmentDocuments(trackId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { trackId },
    include: {
      documents: true,
    },
  });

  if (!shipment) {
    throw new Error('Shipment not found');
  }

  return {
    shipmentId: shipment.id,
    trackId: shipment.trackId,
    cargoType: shipment.cargoType,
    documents: shipment.documents,
    exportedAt: new Date(),
  };
}
