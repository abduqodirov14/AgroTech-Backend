import { Router, Request, Response, NextFunction } from 'express';
import * as shipmentService from '../services/shipmentService';
import * as coldChainService from '../services/coldChainService';
import * as waybillService from '../services/waybillService';
import * as thirdPartyLogistics from '../services/3plIntegrationService';
import * as analyticsService from '../services/analyticsService';
import { seedDemoData } from '../services/seedService';
import { AppError } from '../utils/errors';

const router = Router();

router.get('/overview', async (_req, res, next) => {
  try {
    const data = await shipmentService.getOverview();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/shipments', async (req, res, next) => {
  try {
    const filter = req.query.filter as 'active' | 'delivered' | 'all' | undefined;
    const data = await shipmentService.listShipments(filter);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/track/:trackId', async (req, res, next) => {
  try {
    const data = await shipmentService.getShipmentByTrackId(req.params.trackId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.post('/shipments', async (req, res, next) => {
  try {
    const data = await shipmentService.createShipment(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
});

router.post('/shipments/:trackId/assign', async (req, res, next) => {
  try {
    const data = await shipmentService.assignDriver(req.params.trackId, req.body.driverId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.post('/shipments/:trackId/tracking', async (req, res, next) => {
  try {
    const { lat, lng, tempCelsius } = req.body;
    const data = await shipmentService.addTrackingPoint(req.params.trackId, lat, lng, tempCelsius);
    
    // Check for cold chain violation
    if (tempCelsius !== undefined) {
      const alert = await coldChainService.checkColdChainViolation(req.params.trackId, tempCelsius);
      if (alert) {
        return res.json({ success: true, data, coldChainAlert: alert });
      }
    }
    
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.post('/shipments/:trackId/arrive', async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    await shipmentService.confirmArrival(req.params.trackId, lat, lng);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/shipments/:trackId/complete', async (req, res, next) => {
  try {
    const data = await shipmentService.confirmDelivery(req.params.trackId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/vehicles', async (_req, res, next) => {
  try {
    const data = await shipmentService.listVehicles();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/warehouses', async (_req, res, next) => {
  try {
    const data = await shipmentService.listWarehouses();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/routes', async (_req, res, next) => {
  try {
    const data = await shipmentService.listTopRoutes();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// ❄️ COLD CHAIN ALERTS ENDPOINTS
router.get('/cold-chain/alerts', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = await coldChainService.getColdChainAlerts(limit);
    res.json({ success: true, data: alerts });
  } catch (e) { next(e); }
});

router.post('/cold-chain/alerts/:trackId/resolve', async (req, res, next) => {
  try {
    const { notes } = req.body;
    const data = await coldChainService.resolveColdChainAlert(req.params.trackId, notes);
    res.json({ success: true, data, message: 'Cold chain alert resolved' });
  } catch (e) { next(e); }
});

// 📄 WAYBILL & DOCUMENTS ENDPOINTS
router.post('/shipments/:trackId/waybill', async (req, res, next) => {
  try {
    const waybill = await waybillService.getWaybill(req.params.trackId);
    res.setHeader('Content-Type', 'text/html');
    res.send(waybill);
  } catch (e) { next(e); }
});

router.get('/shipments/:trackId/documents', async (req, res, next) => {
  try {
    const docs = await waybillService.exportShipmentDocuments(req.params.trackId);
    res.json({ success: true, data: docs });
  } catch (e) { next(e); }
});

// 🤝 3PL INTEGRATION ENDPOINTS
router.post('/cargo/offers', async (req, res, next) => {
  try {
    const { weightTons, requiresRefrigeration, destination } = req.body;
    const offers = thirdPartyLogistics.getAvailableCargoCompanies(
      weightTons,
      requiresRefrigeration,
      destination
    );
    res.json({ 
      success: true, 
      data: offers,
      message: `Found ${offers.length} cargo companies available`
    });
  } catch (e) { next(e); }
});

router.post('/cargo/select', async (req, res, next) => {
  try {
    const { trackId, companyId, pickupLat, pickupLng, deliveryLat, deliveryLng, phone } = req.body;
    
    // Assign driver from cargo company
    const driver = await thirdPartyLogistics.assignDriverFromCargoCompany(
      companyId,
      trackId,
      { lat: pickupLat, lng: pickupLng },
      { lat: deliveryLat, lng: deliveryLng }
    );

    // Send SMS to driver with tracking link
    const shipment = await shipmentService.getShipmentByTrackId(trackId);
    await thirdPartyLogistics.sendDriverSMS(
      phone,
      trackId,
      shipment.origin.address,
      shipment.destination.address
    );

    res.json({ 
      success: true, 
      data: {
        driver,
        message: `✅ Driver ${driver.name} assigned. SMS sent with tracking link.`
      }
    });
  } catch (e) { next(e); }
});

router.get('/drivers/nearest', async (req, res, next) => {
  try {
    const { lat, lng, maxDistance } = req.query;
    const driver = await thirdPartyLogistics.findNearestDriver(
      parseFloat(lat as string),
      parseFloat(lng as string),
      maxDistance ? parseInt(maxDistance as string) : 50
    );
    
    if (!driver) {
      return res.status(404).json({ success: false, error: 'No drivers available nearby' });
    }

    res.json({ success: true, data: driver });
  } catch (e) { next(e); }
});

router.get('/drivers/available', async (req, res, next) => {
  try {
    const { region } = req.query;
    const drivers = await thirdPartyLogistics.getAllAvailableDrivers(region as string);
    res.json({ success: true, data: drivers, count: drivers.length });
  } catch (e) { next(e); }
});

// 📊 ANALYTICS & REPORTS ENDPOINTS
router.get('/analytics/overview', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const analytics = await analyticsService.getAnalytics(days);
    res.json({ success: true, data: analytics });
  } catch (e) { next(e); }
});

router.get('/reports/monthly/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const report = await analyticsService.generateMonthlyReport(
      parseInt(year),
      parseInt(month)
    );
    
    // Serve as HTML or JSON
    if (req.query.format === 'html') {
      const html = analyticsService.generateHTMLReport(report, `Monthly Report - ${month}/${year}`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    res.json({ success: true, data: report });
  } catch (e) { next(e); }
});

router.get('/reports/farmer/:farmerId', async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const report = await analyticsService.generateFarmerReport(farmerId, start, end);
    
    // Serve as HTML or JSON
    if (req.query.format === 'html') {
      const html = analyticsService.generateHTMLReport(report, `Farmer Report - ${farmerId}`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    res.json({ success: true, data: report });
  } catch (e) { next(e); }
});

router.get('/reports/export/:farmerId/csv', async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const report = await analyticsService.generateFarmerReport(farmerId, start, end);
    const csv = analyticsService.exportToCSV([report], `farmer-report-${farmerId}.csv`);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="farmer-report-${farmerId}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

router.post('/reports/sync-finance/:farmerId', async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const { startDate, endDate } = req.body;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const report = await analyticsService.generateFarmerReport(farmerId, start, end);
    
    // Update Finance module with Agro-Score
    const result = await analyticsService.updateFinanceWithAgroScore(
      farmerId,
      report.creditScore.agroScoringGrade,
      report.creditScore.creditLimit
    );
    
    res.json({ 
      success: true, 
      data: result,
      agroScore: report.creditScore.agroScoringGrade,
      creditLimit: report.creditScore.creditLimit
    });
  } catch (e) { next(e); }
});

router.post('/seed-demo', async (req, res, next) => {
  try {
    const result = await seedDemoData(req.query.force === 'true');
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }
  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default router;
