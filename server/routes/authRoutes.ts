import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/authValidator';
import { authenticateToken, requireRegisteredUser } from '../middleware/auth';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/guest', authController.guestLogin);
router.post('/refresh', authController.refresh);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, requireRegisteredUser, authController.updateProfile);

export default router;
