import Handlebars from "handlebars";
import { decode } from "html-entities";
import ky from "ky";

import type { NodeExecutor } from "@/features/executions/types";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);

  return safeString;
});

type SlackData = {
  variableName?: string;
  webhookUrl?: string;
  content?: string;
};

export const slackExecutor: NodeExecutor<SlackData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  if (!data.content) {
    throw new Error("Slack node: Message content is required");
  }

  const rawContent = Handlebars.compile(data.content)(context);
  const content = decode(rawContent);

  try {
    const result = await step.run("slack-webhook", async () => {
      if (!data.webhookUrl) {
        throw new Error("Slack node: Webhook URL is required");
      }

      await ky.post(data.webhookUrl, {
        json: {
          content: content,
        },
      });

      if (!data.variableName) {
        throw new Error("Slack node: Variable name is missing");
      }

      return {
        ...context,
        [data.variableName]: {
          messageContent: content.slice(0, 2000),
        },
      };
    });

    return result;
  } catch (error) {
    throw error;
  }
};
