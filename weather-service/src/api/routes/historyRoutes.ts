import { Router, Request, Response } from 'express';
import { generateCSV, generateJSON, generateHTML, HistoryRecord } from '../../services/exportService';
import { logger } from '../../utils/logger';

const router = Router();

const generateMockHistory = (
  startDate: string,
  endDate: string,
  sensor?: string,
  status?: string
): HistoryRecord[] => {
  const records: HistoryRecord[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const sensors = [
    { id: 'SENS-A01', name: 'Sensor A-01' },
    { id: 'SENS-B02', name: 'Sensor B-02' },
    { id: 'SENS-C03', name: 'Sensor C-03' },
    { id: 'SENS-D04', name: 'Sensor D-04' },
  ];
  
  const filteredSensors = sensor && sensor !== 'all' 
    ? sensors.filter(s => s.id === sensor)
    : sensors;
  
  for (let d = new Date(start); d <= end; d.setHours(d.getHours() + 1)) {
    filteredSensors.forEach(s => {
      const sensorStatus = Math.random() > 0.1 ? 'online' : 'offline';
      
      if (status && status !== 'all' && sensorStatus !== status) {
        return;
      }
      
      records.push({
        timestamp: d.toISOString(),
        sensorId: s.id,
        sensorName: s.name,
        temperature: 20 + Math.random() * 10,
        humidity: 40 + Math.random() * 30,
        soilMoisture: 50 + Math.random() * 30,
        ph: 6 + Math.random() * 2,
        status: sensorStatus,
      });
    });
  }
  
  return records;
};

router.get('/history', async (req: Request, res: Response) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = (req.query.endDate as string) || new Date().toISOString();
    const sensor = req.query.sensor as string;
    const status = req.query.status as string;

    logger.info(`📊 Fetching history: ${startDate} to ${endDate}, sensor=${sensor || 'all'}, status=${status || 'all'}`);
    
    const records = generateMockHistory(startDate, endDate, sensor, status);
    
    logger.info(`✅ Found ${records.length} history records`);
    
    res.json({
      success: true,
      data: {
        records,
        total: records.length,
        filters: { startDate, endDate, sensor, status },
      },
    });
  } catch (error: any) {
    logger.error(`❌ History endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history data',
    });
  }
});

router.get('/history/export', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = (req.query.endDate as string) || new Date().toISOString();
    const sensor = req.query.sensor as string;
    const status = req.query.status as string;
    
    logger.info(`📤 Exporting history as ${format}: ${startDate} to ${endDate}`);
    
    const records = generateMockHistory(startDate, endDate, sensor, status);
    
    let content: string;
    let contentType: string;
    let filename: string;
    
    switch (format) {
      case 'json':
        content = generateJSON(records);
        contentType = 'application/json';
        filename = `agrotech-history-${Date.now()}.json`;
        break;
      case 'html':
        content = generateHTML(records);
        contentType = 'text/html';
        filename = `agrotech-history-${Date.now()}.html`;
        break;
      case 'csv':
      default:
        content = generateCSV(records);
        contentType = 'text/csv';
        filename = `agrotech-history-${Date.now()}.csv`;
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(content);
    
    logger.info(`✅ Exported ${records.length} records as ${format}`);
  } catch (error: any) {
    logger.error(`❌ Export endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to export history data',
    });
  }
});

export default router;
