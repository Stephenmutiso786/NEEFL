import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { maintenanceGate } from './middleware/maintenance.js';
import { permissionGate } from './middleware/permissionGate.js';

import authRoutes from './routes/auth.js';
import playerRoutes from './routes/players.js';
import tournamentRoutes from './routes/tournaments.js';
import matchRoutes from './routes/matches.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import streamRoutes from './routes/streams.js';
import disputeRoutes from './routes/disputes.js';
import notificationRoutes from './routes/notifications.js';
import supportRoutes from './routes/support.js';
import walletRoutes from './routes/wallet.js';
import publicRoutes from './routes/public.js';
import betRoutes from './routes/bets.js';
import staffRoutes from './routes/staff.js';
import liveStreamRoutes from './routes/liveStreams.js';
import socialRoutes from './routes/social.js';
import policyRoutes from './routes/policies.js';
import verificationRoutes from './routes/verification.js';
import clubRoutes from './routes/clubs.js';
import achievementRoutes from './routes/achievements.js';
import seasonRoutes from './routes/seasons.js';
import fraudRoutes from './routes/fraud.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(env.uploadDir)));
const publicDir = path.resolve('public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use(maintenanceGate);
app.use(permissionGate);

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/fraud', fraudRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/live-streams', liveStreamRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/seasons', seasonRoutes);

app.use(errorHandler);

if (fs.existsSync(publicDir)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.listen(env.port, () => {
  console.log(`NEEFL API running on port ${env.port}`);
});
