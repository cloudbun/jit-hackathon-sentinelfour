import { Elysia } from "elysia";
import { agentsApi } from "./agents";
import { feedsApi } from "./feeds";
import { dashboardApi } from "./dashboard";
import { applicationsApi } from "./applications";
import { webhookApi } from "./webhook";
import { serverApi } from "./server";
import { recordRequest } from "../lib/server-metrics";

export const api = new Elysia({ prefix: "/api" })
  .onBeforeHandle(({ store }) => {
    (store as any).__reqStart = performance.now();
  })
  .onAfterResponse(({ store, set }) => {
    const start = (store as any).__reqStart;
    if (start) {
      const duration = performance.now() - start;
      const isError = (set.status ?? 200) >= 400;
      recordRequest(duration, isError);
    }
  })
  .use(agentsApi)
  .use(feedsApi)
  .use(dashboardApi)
  .use(applicationsApi)
  .use(webhookApi)
  .use(serverApi);
