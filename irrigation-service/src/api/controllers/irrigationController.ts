import { Request, Response } from 'express';
import { ToggleIrrigationUseCase } from '../../domain/usecases/ToggleIrrigationUseCase';

export class IrrigationController {
  constructor(private toggleIrrigationUseCase: ToggleIrrigationUseCase) {}

  async toggle(req: Request, res: Response): Promise<void> {
    try {
      const { command, zone_id, duration_minutes } = req.body;

      if (!command || !['ON', 'OFF'].includes(command.toUpperCase())) {
        res.status(400).json({
          success: false,
          message: 'Invalid command. Must be ON or OFF',
        });
        return;
      }

      const result = await this.toggleIrrigationUseCase.execute({
        command: command.toUpperCase(),
        zoneId: zone_id,
        durationMinutes: duration_minutes,
      });
      
      res.status(result.success ? 200 : 500).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  async zones(req: Request, res: Response): Promise<void> {
    try {
      const zones = await this.toggleIrrigationUseCase.getZones();
      res.status(200).json({ success: true, data: zones });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch zones',
        error: error.message,
      });
    }
  }
}
