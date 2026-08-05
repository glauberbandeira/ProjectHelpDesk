import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';
import { login } from '../controllers/auth.controller.js';


export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);