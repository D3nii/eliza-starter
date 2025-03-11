import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { tweetzPlugin } from "../plugins/Tweetz/src/index.ts";

/**
 * Custom AutoClient that triggers the discordFetcher plugin every 10 minutes
 */
export class CustomAutoClient {
  interval: NodeJS.Timeout;
  runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    
    // Run every 10 minutes (10 * 60 * 1000 ms)
    this.interval = setInterval(
      async () => {
        await this.runDiscordFetcher();
      },
      10 * 60 * 1000
    );
    
    // Run immediately on startup
    this.runDiscordFetcher();
  }

  async runDiscordFetcher() {
    try {
      elizaLogger.log("Running auto client for Discord Fetcher...");
      
      // Find the discord history action
      const discordHistoryAction = tweetzPlugin.actions[0];
      
      if (!discordHistoryAction) {
        elizaLogger.error("Discord history action not found");
        return;
      }
      
      // Create a mock message to trigger the action with the specific command
      const mockMessage = {
        content: {
          text: "Big Brains Do the thing the last 4h of the conversation",
          source: "auto_client"
        }
      };
      
      // Call the action handler
      elizaLogger.log("Triggering Discord Fetcher action...");
      await discordHistoryAction.handler(
        this.runtime,
        mockMessage,
        {}, // empty state
        {}, // empty options
        (response: any) => {
          elizaLogger.log("Discord Fetcher completed with response:", response.text.substring(0, 100) + "...");
        }
      );
      
      elizaLogger.log("Discord Fetcher auto task completed");
    } catch (error) {
      elizaLogger.error("Error in auto client Discord Fetcher:", error);
    }
  }
}

export const CustomAutoClientInterface = {
  start: async (runtime: IAgentRuntime) => {
    const client = new CustomAutoClient(runtime);
    return client;
  },
  stop: async (_runtime: IAgentRuntime) => {
    console.warn("Custom Auto client does not support stopping yet");
  }
};

export default CustomAutoClientInterface; 