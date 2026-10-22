import { Router } from 'express';
import healthRoutes from './health.routes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);

export default apiRouter;
