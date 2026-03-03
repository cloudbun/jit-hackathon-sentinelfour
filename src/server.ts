import { Elysia } from "elysia";
import { api } from "./api";
import { db } from "./db";
import { startFeedScheduler } from "./lib/feed-scheduler";
import path from "path";

const clientDir = path.resolve("dist/client");
const indexHtml = path.join(clientDir, "index.html");

const app = new Elysia()
  .use(api)
  .get("/assets/*", ({ params }) => Bun.file(path.join(clientDir, "assets", params["*"])))
  .get("/", () => Bun.file(indexHtml))
  .get("/*", () => Bun.file(indexHtml))
  .listen(3000);

startFeedScheduler();

console.log(`Server running at http://localhost:${app.server?.port}`);

export type App = typeof app;
