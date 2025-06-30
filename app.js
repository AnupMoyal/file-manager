import express, { urlencoded, json } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import router from './src/api/v1/index.js'; // ✅ MAIN v1 ROUTER
import { db } from './src/api/v1/config/mongodb.js';
import { badRequest } from './src/api/v1/helpers/response.helpers.js';

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(urlencoded({ extended: true, limit: '50mb' }));
app.use(json({ limit: '50mb' }));

// DB connect
db(); // 🔁 Make sure your mongodb.js file exports `mongodb`, not `db`

// Mount API router
app.use('/v1', router);

// Handle invalid routes (✅ Fixed: No wrong Laravel-style syntax)
// app.all('*', (req, res) => {
//   return badRequest(res, 'Invalid URI');
// });

export default app;