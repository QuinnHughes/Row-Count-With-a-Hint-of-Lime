import express from 'express';
import cors from 'cors';
import path from 'path';
import router from './routes';
import { seedIfEmpty } from './db';

const app = express();
app.use(cors());
app.use(express.json());

seedIfEmpty();

app.use('/api', router);

// In production serve client
if (process.env.NODE_ENV === 'production') {
  const clientPath = process.env.CLIENT_DIST || path.join(process.cwd(), 'client', 'dist');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
  console.log('Serving static client from', clientPath);
}

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
