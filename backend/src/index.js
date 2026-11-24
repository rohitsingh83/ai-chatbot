// Serverless entrypoint (Vercel): export the HTTP server instead of listening.
// Socket.io works over WebSockets on Vercel Functions with Fluid compute.
// For local development and Render/Railway/Docker, use `npm start` (src/server.js).
import { buildServer } from './bootstrap.js';

const { server } = await buildServer();

export default server;
