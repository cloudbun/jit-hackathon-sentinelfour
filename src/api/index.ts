import { Elysia } from "elysia";
import { agentsApi } from "./agents";
import { feedsApi } from "./feeds";
import { dashboardApi } from "./dashboard";

export const api = new Elysia({ prefix: "/api" })
  .use(agentsApi)
  .use(feedsApi)
  .use(dashboardApi);
