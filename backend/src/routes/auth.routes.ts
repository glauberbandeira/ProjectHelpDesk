import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/register', register);