/**
 * @file       marketplaceLogisticsService.ts
 * @path       marketplace-service/src/services/marketplaceLogisticsService.ts
 * @description When buyer purchases product, auto-create logistics shipment
 */

import axios from 'axios';
import logger from '../utils/logger';

const LOGISTICS_API = process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008';
const SERVICE_KEY = process.env.SERVICE_API_KEY || 'service-key-marketplace';

interface MarketplaceOrder {
  orderId: string;
  buyerId: string;
  farmerId: string;
  productName: string;
  quantity: number;
  quantityUnit: string;
  totalPrice: number;
  buyerLocation: {
    city: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  productQuality: 'STANDARD' | 'PREMIUM' | 'EXPORT';
}

interface CreatedShipment {
  shipmentId: string;
  trackId: string;
  pickupETA: Date;
  deliveryETA: Date;
  estimatedFreightCost: number;
}

/**
 * When Marketplace order is confirmed (buyer paid), auto-create Logistics shipment
 */
export async function createLogisticsShipment(
  order: MarketplaceOrder
): Promise<CreatedShipment> {
  try {
    logger.info('📦 Creating logistics shipment from marketplace order', {
      orderId: order.orderId,
      farmerId: order.farmerId,
      quantity: order.quantity,
      destination: order.buyerLocation.country,
    });

    // Determine temperature requirements based on product
    let tempMin = 2;
    let tempMax = 8;
    
    if (order.productName.toLowerCase().includes('cherry')) {
      tempMin = -1;
      tempMax = 4;
    } else if (order.productName.toLowerCase().includes('apple')) {
      tempMin = -2;
      tempMax = 3;
    } else if (order.productName.toLowerCase().includes('berry')) {
      tempMin = 0;
      tempMax = 5;
    }

    // If export (international), use cold chain
    const requiresColdChain = order.buyerLocation.country !== 'Uzbekistan';

    const shipmentRequest = {
      farmerId: order.farmerId,
      buyerId: order.buyerId,
      orderId: order.orderId,
      productName: order.productName,
      quantityKg: order.quantityUnit === 'kg' ? order.quantity : order.quantity * 1000,
      qualityGrade: order.productQuality,
      pickupLocation: {
        city: 'Fergana', // Default, would come from farmer profile
        country: 'Uzbekistan',
      },
      deliveryLocation: {
        city: order.buyerLocation.city,
        country: order.buyerLocation.country,
        coordinates: order.buyerLocation.coordinates,
      },
      temperatureMin: tempMin,
      temperatureMax: tempMax,
      requiresColdChain,
      expectedDeliveryDays:
        order.buyerLocation.country === 'Uzbekistan' ? 1 : 7,
    };

    const response = await axios.post(
      `${LOGISTICS_API}/api/v1/logistics/shipments/create`,
      shipmentRequest,
      {
        headers: {
          'X-API-Key': SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    const shipment = response.data.data;

    logger.info('✅ Shipment created successfully', {
      shipmentId: shipment.shipmentId,
      orderId: order.orderId,
      trackId: shipment.trackId,
    });

    // Link shipment to marketplace order
    await linkOrderToShipment(order.orderId, shipment.shipmentId);

    return {
      shipmentId: shipment.shipmentId,
      trackId: shipment.trackId,
      pickupETA: new Date(shipment.pickupETA),
      deliveryETA: new Date(shipment.deliveryETA),
      estimatedFreightCost: shipment.estimatedFreightCost,
    };
  } catch (error: any) {
    logger.error('❌ Failed to create logistics shipment', {
      error: error.message,
      orderId: order.orderId,
    });
    throw new Error(`Logistics shipment creation failed: ${error.message}`);
  }
}

/**
 * Store link between Marketplace order and Logistics shipment
 */
async function linkOrderToShipment(orderId: string, shipmentId: string) {
  try {
    // In production, save to database:
    // await db.orderShipment.create({ orderId, shipmentId })
    logger.info('🔗 Order linked to shipment', { orderId, shipmentId });
  } catch (error) {
    logger.error('Failed to link order to shipment', { error });
  }
}

/**
 * Get shipment details for marketplace order
 */
export async function getOrderShipment(orderId: string) {
  try {
    const response = await axios.get(
      `${LOGISTICS_API}/api/v1/logistics/shipments/order/${orderId}`,
      {
        headers: { 'X-API-Key': SERVICE_KEY },
      }
    );
    return response.data.data;
  } catch (error) {
    logger.error('Failed to fetch order shipment', { error });
    return null;
  }
}

/**
 * Notify buyer about shipment status
 */
export async function notifyBuyerOfShipment(orderId: string, trackingUrl: string) {
  logger.info('📧 Sending shipment notification to buyer', {
    orderId,
    trackingUrl,
  });

  // In production: send email/SMS via notification service
  return {
    success: true,
    message: `Buyer notified. Track at: ${trackingUrl}`,
  };
}

/**
 * When shipment completes, update marketplace order status
 * (Called from Logistics webhook)
 */
export async function onShipmentDelivered(shipmentId: string, orderId: string) {
  try {
    logger.info('🎉 Shipment delivered - updating marketplace order', {
      shipmentId,
      orderId,
    });

    // Mark order as delivered
    // await db.order.update({ id: orderId, status: 'DELIVERED' })

    // Trigger buyer review prompt
    // await notificationService.send(buyer, "Order delivered! Please review.")

    return { success: true };
  } catch (error) {
    logger.error('Failed to update order status', { error });
  }
}

/**
 * Calculate estimated shipping cost for marketplace listing
 * (Used to show buyer final price before purchase)
 */
export async function estimateShippingCost(
  productName: string,
  quantityKg: number,
  destinationCountry: string
): Promise<number> {
  try {
    const response = await axios.post(
      `${LOGISTICS_API}/api/v1/logistics/shipments/estimate-cost`,
      {
        productName,
        quantityKg,
        destinationCountry,
      },
      {
        headers: { 'X-API-Key': SERVICE_KEY },
      }
    );

    return response.data.data.estimatedCost || 0;
  } catch (error) {
    logger.error('Failed to estimate shipping cost', { error });
    return 50000; // Default estimate (soʻm)
  }
}
