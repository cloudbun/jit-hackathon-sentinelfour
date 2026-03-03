import { Elysia } from "elysia";
import { agentsApi } from "./agents";
import { feedsApi } from "./feeds";
import { dashboardApi } from "./dashboard";
import { applicationsApi } from "./applications";
import { webhookApi } from "./webhook";

export const api = new Elysia({ prefix: "/api" })
  .use(agentsApi)
  .use(feedsApi)
  .use(dashboardApi)
  .use(applicationsApi)
  .use(webhookApi);
