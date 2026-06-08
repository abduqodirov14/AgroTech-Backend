import { Router, Request, Response } from 'express';
import { generateCSV, generateJSON, generateHTML, HistoryRecord } from '../../services/exportService';
import { logger } from '../../utils/logger';

const router = Router();

router.get('/history', async (req: Request, res: Response) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = (req.query.endDate as string) || new Date().toISOString();
    const sensor = req.query.sensor as string;
    const status = req.query.status as string;

    const records: HistoryRecord[] = [];

    return res.json({
      success: true,
      data: {
        records,
        total: records.length,
        filters: { startDate, endDate, sensor, status },
      },
    });
  } catch (error: any) {
    logger.error(`History endpoint error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch history data' });
  }
});

router.get('/history/export', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'csv';

    const records: HistoryRecord[] = [];

    let content: string;
    let contentType: string;
    let filename: string;

    contentType = 'application/json';
    content = generateJSON(records);

    res.setHeader('Content-Disposition', `attachment; filename="agrotech-history-${Date.now()}.${format}"`);
    res.setHeader('Content-Type', contentType);
    return res.send(content);
  } catch (error: any) {
    logger.error(`Export endpoint error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to export history data' });
  }
});

export default router;
