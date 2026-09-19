import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import { connectDb } from './data/db.js';
import { seedIfEmpty } from './data/store.js';
import authRouter from './routes/auth.js';
import studentsRouter from './routes/students.js';
import gradesRouter from './routes/grades.js';
import feesRouter from './routes/fees.js';
import teachersRouter from './routes/teachers.js';
import { isSmsLive, activeSmsProvider, smsDebug } from './services/sms/index.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', smsLive: isSmsLive, smsProvider: activeSmsProvider, smsDebug })
);

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/fees', feesRouter);
app.use('/api/teachers', teachersRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Something went wrong' });
});

async function main() {
  await connectDb();
  console.log('Connected to MongoDB');
  await seedIfEmpty();

  app.listen(PORT, () => {
    console.log(`Secondary SMS API listening on http://localhost:${PORT}`);
    console.log(
      `SMS provider: ${isSmsLive ? `${activeSmsProvider} (live)` : 'mock (logs OTP to this console)'}`
    );
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
