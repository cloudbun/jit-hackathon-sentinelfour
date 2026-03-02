import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { api } from "./api";
import { db } from "./db";
import { startFeedScheduler } from "./lib/feed-scheduler";

const app = new Elysia()
  .use(cors({ origin: "http://localhost:5173" }))
  .use(api)
  .listen(3000);

startFeedScheduler();

console.log(`API server running at http://localhost:${app.server?.port}`);

export type App = typeof app;
