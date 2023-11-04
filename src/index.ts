import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { handleConnection } from './services/socketServices.js';
import { homeRoute, publish } from './services/expressServices.js';
import { newUUID } from './utils/helpers.js';
import { Cluster } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import CronJobHandler from "./db/redisCronJobs.js";
import 'dotenv/config';
import cron from 'node-cron';
import cors from 'cors';

const PORT = process.env.ENV_PORT || 3003;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const redisEndpoints = [process.env.CACHE_ENDPOINT || 'redis://localhost:6379'];
const corsOptions = {
  origin: true,
  credentials: true,
};
const nodes = redisEndpoints.map(endpoint => {
  const [host, port] = endpoint.split(':');
  return { host, port: parseInt(port, 10) };
});

export const redis = new Cluster(nodes); // Use Cluster to connect to Redis
console.log('Connected to Redis');

const app = express();
app.use(cors(corsOptions));
app.set('trust proxy', 1);
app.use(express.json());

const httpServer = createServer(app);

declare module 'express-session' {
  interface SessionData {
    twineID: string;
    twineRC: boolean;
    twineTS: number;
  }
};

// TypeScript types
interface messageObject {
  message: string;
};

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
};

interface ClientToServerEvents {
  hello: () => void;
  message: (message: messageObject) => void;
  session: (message: SessionObject) => void;
};

interface InterServerEvents {
  ping: () => void;
};

interface SocketData {
  name: string;
  age: number;
  sessionId: string;
  offset: Date;
};

interface SessionObject {
  sessionId: string;
};

// instantiate new WS server
export const io = new Server<
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Adapter logic
const subClient = redis.duplicate();
io.adapter(createAdapter(redis, subClient));

// WS Server Logic
io.on("connection", handleConnection);

// Backend API
app.get('/', homeRoute);
app.post('/api/twine', publish);

app.get('/delete-cookie', (_, res) => {
  res.cookie('twine', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0) // Set to a past date
  });
  res.send('Cookie deleted');
});

// Frontend code now sends request to this route before establishing WebSocket connection
app.get('/set-cookie', (req, res) => {
  const cookies = req.headers.cookie || '';

  // Parse the cookies
  const cookiesObj = Object.fromEntries(cookies.split(';').map(cookie => {
    const [name, value] = cookie.trim().split('=');
    return [name, value];
  }));

  if (!cookiesObj.twinert) {
    const sessionID = newUUID();

    res.cookie('twinert', sessionID, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TWENTY_FOUR_HOURS
    });

    console.log('First cookie set ', sessionID);
    res.send('First cookie set');
  } else if (!cookiesObj.twinerc) {
    res.cookie('twinerc', 'y', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TWENTY_FOUR_HOURS
    });
    console.log('RC cookie set');
    res.send('RC cookie set');
  } else {
    console.log('RC cookie already set');
    res.send('RC cookie already set');
  }
});

// cron job redis
const cronSchedule = "*/3 * * * *"; // runs every 3 minutes
cron.schedule(cronSchedule, CronJobHandler.messageCronJob);

// listening on port 3001
httpServer.listen(PORT, () => {
  console.log('TwineServer listening on port', PORT);
});