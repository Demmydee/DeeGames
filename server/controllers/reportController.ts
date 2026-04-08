import { Request, Response } from 'express';
import * as reportService from '../services/reportService';

export const submitReport = async (req: Request, res: Response) => {
  try {
    const { reportedId, matchId, reason, description } = req.body;
    const reporterId = (req as any).user.id;
    const report = await reportService.submitReport(reporterId, reportedId, matchId, reason, description);
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const reports = await reportService.getMyReports(userId);
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
