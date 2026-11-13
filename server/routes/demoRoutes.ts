import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DemoBotService } from '../services/demoBotService';

const router = Router();

router.use(authenticateToken);

router.post('/matches', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { gameType, variant } = req.body || {};
    const match = DemoBotService.createMatch(
      { id: user.id, username: user.username || 'Guest' },
      gameType,
      variant
    );
    res.status(201).json(match);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create demo match' });
  }
});

router.get('/matches/:matchId', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const match = DemoBotService.getMatch(req.params.matchId, user.id);
    res.json(match);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Demo match not found' });
  }
});

router.get('/matches/:matchId/state', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const state = DemoBotService.getGameState(req.params.matchId, user.id);
    res.json(state);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Demo game state not found' });
  }
});

router.post('/matches/:matchId/move', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = DemoBotService.processHumanMove(req.params.matchId, user.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid demo move' });
  }
});

router.get('/matches/:matchId/result', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = DemoBotService.getResult(req.params.matchId, user.id);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Demo match result not found' });
  }
});

router.post('/matches/:matchId/heartbeat', (req: Request, res: Response) => {
  res.json({ ok: true });
});

router.post('/matches/:matchId/leave', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = DemoBotService.leaveMatch(req.params.matchId, user.id);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Demo match not found' });
  }
});

router.post('/matches/:matchId/restart', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const match = DemoBotService.restartMatch(req.params.matchId, {
      id: user.id,
      username: user.username || 'Guest'
    });
    res.json(match);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to restart demo match' });
  }
});

export default router;
