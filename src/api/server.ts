import { Elysia } from "elysia";
import { getMetrics } from "../lib/server-metrics";

export const serverApi = new Elysia({ prefix: "/server" })
  .get("/health", () => getMetrics());
