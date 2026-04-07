import { realtimeMiddleware } from "@inngest/realtime/middleware";
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "Floodrix",
  middleware: [realtimeMiddleware()],
});
