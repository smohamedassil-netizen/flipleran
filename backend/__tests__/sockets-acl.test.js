/**
 * sockets-acl.test.js
 *
 * Tests that Socket.io room ACL prevents a user from joining another user's
 * personal notification room (user_<id>).
 *
 * Run:  npm test -- sockets-acl
 */
import { jest } from '@jest/globals';

// ── Mock Mongoose models BEFORE importing server ──────────────────────
jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    exists: jest.fn().mockResolvedValue(null),
  },
}));

jest.unstable_mockModule('../models/Message.js', () => ({
  default: {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/Progress.js', () => ({
  default: { exists: jest.fn().mockResolvedValue(null) },
}));

jest.unstable_mockModule('../models/Course.js', () => ({
  default: { exists: jest.fn().mockResolvedValue(null) },
}));

jest.unstable_mockModule('../models/Prosit.js', () => ({
  default: { exists: jest.fn().mockResolvedValue(null) },
  PROSIT_ROLES: ['animateur', 'secretaire', 'scribe', 'gestionnaire', 'membre'],
}));

jest.unstable_mockModule('../models/Project.js', () => ({
  default: { exists: jest.fn().mockResolvedValue(null) },
}));

jest.unstable_mockModule('../config/db.js', () => ({
  default: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../services/points.js', () => ({
  seedBadges: jest.fn().mockResolvedValue(null),
  addPoints: jest.fn().mockResolvedValue(null),
  triggerAutoBadge: jest.fn().mockResolvedValue(null),
  checkChampionBadge: jest.fn().mockResolvedValue(null),
  BADGE_DEFS: [],
}));

jest.unstable_mockModule('../services/rewardsSeed.js', () => ({
  seedRewards: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../services/contentSeed.js', () => ({
  seedDemoContent: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../services/demoSeed.js', () => ({
  seedDemoData: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../services/prositsSeed.js', () => ({
  seedProsits: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../services/usersSeed.js', () => ({
  seedUsers: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../services/videoMigration.js', () => ({
  migrateBrokenVideos: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../services/notificationScheduler.js', () => ({
  startNotificationScheduler: jest.fn(),
}));

// ── Import server AFTER mocks ────────────────────────────────────────
const { io, httpServer } = await import('../server.js');

import { io as ioClient } from 'socket.io-client';

const PORT = 5099;
const USER_A_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const USER_B_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

// Mock JWT verification to accept any token and extract userId from it
import jwt from 'jsonwebtoken';
const MOCK_SECRET = process.env.JWT_SECRET || 'test-secret';

function makeToken(userId) {
  return jwt.sign({ id: userId, role: 'etudiant' }, MOCK_SECRET);
}

// Patch User.findById to return a user for our test IDs
const User = (await import('../models/User.js')).default;
User.findById.mockImplementation((id) => ({
  select: jest.fn().mockResolvedValue({
    _id: id,
    nom: 'Test',
    prenom: 'User',
    role: 'etudiant',
  }),
}));

let clientA;

beforeAll((done) => {
  httpServer.listen(PORT, done);
});

afterAll((done) => {
  if (clientA) clientA.disconnect();
  io.close();
  httpServer.close(done);
});

describe('Socket ACL — personal room isolation', () => {
  test('User A cannot join user_B notification room', (done) => {
    clientA = ioClient(`http://localhost:${PORT}`, {
      auth: { token: makeToken(USER_A_ID) },
      transports: ['websocket'],
    });

    clientA.on('connect', () => {
      // Attempt to join user B's personal room
      clientA.emit('join', `user_${USER_B_ID}`);
    });

    clientA.on('error', (data) => {
      expect(data.message).toMatch(/refus/i);
      done();
    });

    // Safety timeout — if no error emitted, fail
    setTimeout(() => {
      done(new Error('Expected an error event for unauthorized room join, but none was received'));
    }, 3000);
  });

  test('User A can join their own notification room via join event', (done) => {
    const client = ioClient(`http://localhost:${PORT}`, {
      auth: { token: makeToken(USER_A_ID) },
      transports: ['websocket'],
    });

    client.on('connect', () => {
      // This should succeed (no error event)
      client.emit('join', `user_${USER_A_ID}`);

      // Give it a moment, then verify no error
      setTimeout(() => {
        client.disconnect();
        done();
      }, 500);
    });

    client.on('error', (data) => {
      client.disconnect();
      done(new Error(`Unexpected error: ${data.message}`));
    });
  });
});
