// Serverless entrypoint (Vercel): export the HTTP server instead of listening.
// Socket.io works over WebSockets on Vercel Functions with Fluid compute.
// For local development and Render/Railway/Docker, use `npm start` (src/server.js).
// eslint-disable-next-line no-unused-vars -- Vercel detects Express entrypoints by this import.
import express from 'express';
import { buildServer } from './bootstrap.js';

const { server } = await buildServer();

export default server;
