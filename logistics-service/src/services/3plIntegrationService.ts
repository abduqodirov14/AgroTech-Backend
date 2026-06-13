import { logger } from '../utils/logger';

export interface CargoCompany {
  id: string;
  name: string;
  logo: string;
  country: string;
  serviceName: string;
  pricePerKg: number;
  estimatedDays: number;
  features: string[];
  rating: number;
}

export interface CargoOffer {
  companyId: string;
  company: CargoCompany;
  totalPrice: number;
  estimatedDeliveryDate: Date;
  insurance: number;
  commission: number;
  currency: string;
}

export interface DriverAssignment {
  id: string;
  name: string;
  phone: string;
  vehicle: {
    plate: string;
    type: string;
    capacity: number;
  };
  currentLocation: {
    lat: number;
    lng: number;
  };
}

// Mock database of 3PL logistics companies
const AVAILABLE_CARGO_COMPANIES: CargoCompany[] = [
  {
    id: '3pl-yandex',
    name: 'Yandex.Cargo',
    logo: 'https://yandex.com/logo.svg',
    country: 'Russia',
    serviceName: 'Premium Express Refrigerated',
    pricePerKg: 0.08,
    estimatedDays: 3,
    features: ['GPS Tracking', 'Temperature Control', 'Insurance Included'],
    rating: 4.8,
  },
  {
    id: '3pl-dhl',
    name: 'DHL Express',
    logo: 'https://dhl.com/logo.svg',
    country: 'Global',
    serviceName: 'International Express',
    pricePerKg: 0.12,
    estimatedDays: 5,
    features: ['Global Network', 'Professional Handling', 'Full Tracking'],
    rating: 4.7,
  },
  {
    id: '3pl-local',
    name: 'AeroExpress (Uzbek Local)',
    logo: 'https://local-cargo.uz/logo.svg',
    country: 'Uzbekistan',
    serviceName: 'Regional Delivery',
    pricePerKg: 0.05,
    estimatedDays: 2,
    features: ['Local Expertise', 'Fast Delivery', 'Cost Effective'],
    rating: 4.5,
  },
  {
    id: '3pl-fedex',
    name: 'FedEx International',
    logo: 'https://fedex.com/logo.svg',
    country: 'USA',
    serviceName: 'International Priority',
    pricePerKg: 0.15,
    estimatedDays: 4,
    features: ['Door-to-Door', 'Real-time Tracking', 'Premium Service'],
    rating: 4.6,
  },
];

// Get available cargo companies for shipment
export function getAvailableCargoCompanies(
  weightTons: number,
  requiresRefrigeration: boolean,
  destination: string
): CargoOffer[] {
  const weightKg = weightTons * 1000;
  const offers: CargoOffer[] = [];

  AVAILABLE_CARGO_COMPANIES.forEach((company) => {
    // Calculate total price
    const baseCost = weightKg * company.pricePerKg;
    const insuranceCost = baseCost * 0.05; // 5% insurance
    const totalPrice = baseCost + insuranceCost;
    const commission = totalPrice * 0.03; // 3% commission for us

    // Estimate delivery date
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + company.estimatedDays);

    offers.push({
      companyId: company.id,
      company,
      totalPrice: Math.round(totalPrice),
      estimatedDeliveryDate: deliveryDate,
      insurance: Math.round(insuranceCost),
      commission: Math.round(commission),
      currency: 'USD',
    });
  });

  // Sort by price (cheapest first)
  return offers.sort((a, b) => a.totalPrice - b.totalPrice);
}

// Mock API call to 3PL company to assign driver
export async function assignDriverFromCargoCompany(
  companyId: string,
  shipmentTrackId: string,
  pickupLocation: { lat: number; lng: number },
  deliveryLocation: { lat: number; lng: number }
): Promise<DriverAssignment> {
  // Simulate API call to cargo company
  logger.info('Calling 3PL company API', { companyId, trackId: shipmentTrackId });

  // Mock response from Yandex/DHL/etc
  const mockDrivers: { [key: string]: DriverAssignment } = {
    '3pl-yandex': {
      id: 'drv-yandex-001',
      name: 'Sergey Petrov',
      phone: '+7-999-123-4567',
      vehicle: {
        plate: 'А123БВ77',
        type: 'REFRIGERATED_20T',
        capacity: 20,
      },
      currentLocation: { lat: 41.2995, lng: 69.2401 }, // Tashkent
    },
    '3pl-dhl': {
      id: 'drv-dhl-001',
      name: 'Ahmed Hassan',
      phone: '+966-50-123-4567',
      vehicle: {
        plate: 'DHL-5G88',
        type: 'REFRIGERATED_15T',
        capacity: 15,
      },
      currentLocation: { lat: 41.3, lng: 69.24 },
    },
    '3pl-local': {
      id: 'drv-local-001',
      name: 'Botir Akramov',
      phone: '+998-90-123-4567',
      vehicle: {
        plate: 'УЗ-001-AA',
        type: 'REFRIGERATED_10T',
        capacity: 10,
      },
      currentLocation: { lat: 41.29, lng: 69.24 },
    },
    '3pl-fedex': {
      id: 'drv-fedex-001',
      name: 'Juan Martinez',
      phone: '+1-800-123-4567',
      vehicle: {
        plate: 'FDX-7K99',
        type: 'REFRIGERATED_20T',
        capacity: 20,
      },
      currentLocation: { lat: 41.3, lng: 69.25 },
    },
  };

  // Simulate 2-second API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const driver =
    mockDrivers[companyId] ||
    mockDrivers['3pl-local']; /* Default to local if company not found */

  logger.info('✅ Driver assigned from 3PL company', {
    companyId,
    trackId: shipmentTrackId,
    driver: driver.name,
  });

  return driver;
}

// Send SMS to driver (mock)
export async function sendDriverSMS(
  phoneNumber: string,
  trackId: string,
  pickupAddress: string,
  deliveryAddress: string
): Promise<{ messageId: string; status: string }> {
  const trackingLink = `https://agrohub.uz/driver/${trackId}`;

  const message = `
🚚 AgroHub Delivery Order
Track ID: ${trackId}
Pickup: ${pickupAddress.substring(0, 30)}...
Delivery: ${deliveryAddress.substring(0, 30)}...
Link: ${trackingLink}
  `.trim();

  logger.info('📱 SMS sent to driver', {
    phone: phoneNumber.slice(-4), // Last 4 digits only
    trackId,
  });

  return {
    messageId: `sms-${Date.now()}`,
    status: 'sent',
  };
}

// Get driver location stream (mock real-time updates)
export async function getDriverLocation(driverId: string) {
  // In production, this would call the 3PL company API
  return {
    driverId,
    lat: 41.2995 + (Math.random() - 0.5) * 0.01,
    lng: 69.2401 + (Math.random() - 0.5) * 0.01,
    timestamp: new Date(),
    accuracy: 5, // meters
  };
}

// Get all active drivers from all cargo companies
export async function getAllAvailableDrivers(region: string = 'Tashkent'): Promise<DriverAssignment[]> {
  // Mock: Get drivers from all integrated 3PL companies
  return [
    {
      id: 'drv-yandex-001',
      name: 'Sergey Petrov',
      phone: '+7-999-123-4567',
      vehicle: { plate: 'А123БВ77', type: 'REFRIGERATED_20T', capacity: 20 },
      currentLocation: { lat: 41.2995, lng: 69.2401 },
    },
    {
      id: 'drv-local-002',
      name: 'Dilshod Raxmatov',
      phone: '+998-90-999-8888',
      vehicle: { plate: 'УЗ-055-AB', type: 'REFRIGERATED_15T', capacity: 15 },
      currentLocation: { lat: 41.3, lng: 69.24 },
    },
    {
      id: 'drv-dhl-003',
      name: 'Rustam Ishmakov',
      phone: '+998-91-777-6666',
      vehicle: { plate: 'DHL-2A44', type: 'REFRIGERATED_20T', capacity: 20 },
      currentLocation: { lat: 41.295, lng: 69.242 },
    },
  ];
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest driver to pickup location
export async function findNearestDriver(
  pickupLat: number,
  pickupLng: number,
  maxDistance: number = 50 // km
): Promise<DriverAssignment | null> {
  const drivers = await getAllAvailableDrivers();

  let nearest: { driver: DriverAssignment; distance: number } | null = null;

  drivers.forEach((driver) => {
    const distance = calculateDistance(
      pickupLat,
      pickupLng,
      driver.currentLocation.lat,
      driver.currentLocation.lng
    );

    if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
      nearest = { driver, distance };
    }
  });

  if (nearest) {
    logger.info('🎯 Nearest driver found', {
      driver: nearest.driver.name,
      distance: nearest.distance.toFixed(1) + ' km',
    });
    return nearest.driver;
  }

  logger.warn('❌ No drivers found within range', { maxDistance });
  return null;
}
