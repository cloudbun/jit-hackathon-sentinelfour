import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { api } from "./api";
import { db } from "./db";
import { startFeedScheduler } from "./lib/feed-scheduler";

const app = new Elysia()
  .use(api)
  .use(
    staticPlugin({
      assets: "dist/client",
      prefix: "/",
    })
  )
  .get("/*", () => Bun.file("dist/client/index.html"))
  .listen(3000);

startFeedScheduler();

console.log(`Server running at http://localhost:${app.server?.port}`);

export type App = typeof app;
