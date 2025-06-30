import { Router } from 'express';
import folderRoutes from './routes/folder.routes.js'; // ✅ correct import

const router = Router();

// ✅ All folder APIs under /v1/folders
router.use('/folders', folderRoutes);

export default router;
     