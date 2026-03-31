import { Router } from 'express';
import * as lobbyController from '../controllers/lobbyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/rooms', authenticateToken, lobbyController.getRoomCategories);
router.get('/rooms/:id', authenticateToken, lobbyController.getRoomCategoryById);
router.get('/rooms/:id/occupancy', authenticateToken, lobbyController.getRoomOccupancy);
router.get('/rooms/:id/games', authenticateToken, lobbyController.getRoomGames);
router.get('/game-types', authenticateToken, lobbyController.getGameTypes);

export default router;
