import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { tweetzPlugin } from "../plugins/Tweetz/src/index.ts";
import { dynoPlugin } from "../plugins/Dyno/src/index.ts";
import { telebugPlugin } from "../plugins/Telebug/src/index.ts";
import { quantfasePlugin } from "../plugins/Quantfase/src/index.ts";

interface PluginState {
  lastRunTime: Date | null;
  name: string;
}

/**
 * Custom AutoClient that triggers multiple plugins at specific times
 */
export class CustomAutoClient {
  interval: NodeJS.Timeout;
  runtime: IAgentRuntime;
  plugins: { [key: string]: PluginState } = {
    tweetz: { lastRunTime: null, name: "tweetz" },
    dyno: { lastRunTime: null, name: "dyno" },
    telebug: { lastRunTime: null, name: "telebug" },
    quantfase: { lastRunTime: null, name: "quantfase" }
  };

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    
    // Run check every minute
    this.interval = setInterval(
      async () => {
        await this.checkAndRunPlugins();
      },
      60 * 1000 // Check every minute
    );

    this.checkAndRunPlugins();

    // // For testing - force run immediately
    // elizaLogger.log("Running test execution for all plugins...");
    // this.forceRunAll();
  }

  private shouldRun(): boolean {
    // Get current time in PT (Pacific Time - Los Angeles)
    const now = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const ptDate = new Date(now);
    
    const hour = ptDate.getHours();
    const minute = ptDate.getMinutes();

    // Log current time every 30 minutes for monitoring
    if (minute === 0 || minute === 30) {
      elizaLogger.log(`Current time (PT): ${hour}:${minute.toString().padStart(2, '0')}`);
    }

    // 6:00 AM PT
    const morningRun = hour === 6 && minute === 0;
    
    // 4:30 PM PT
    const eveningRun = hour === 16 && minute === 30;

    return morningRun || eveningRun;
  }

  private getHoursSinceLastRun(pluginState: PluginState): number {
    if (!pluginState.lastRunTime) {
      return 24; // Default to 24 hours on first run
    }
    
    // Get current time in PT using consistent timezone handling
    const ptNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const ptLastRun = new Date(pluginState.lastRunTime.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    
    const diffMs = ptNow.getTime() - ptLastRun.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  }

  private getPluginAction(pluginName: string) {
    switch(pluginName) {
      case 'tweetz':
        return tweetzPlugin.actions[0];
      case 'dyno':
        return dynoPlugin.actions[0];
      case 'telebug':
        return telebugPlugin.actions[0];
      case 'quantfase':
        return quantfasePlugin.actions[0];
      default:
        return null;
    }
  }

  async checkAndRunPlugins() {
    try {
      if (!this.shouldRun()) {
        return;
      }

      elizaLogger.log("Running scheduled commands for all plugins...");
      
      // Run each plugin in sequence
      for (const pluginState of Object.values(this.plugins)) {
        await this.runPlugin(pluginState);
      }

      elizaLogger.log("All scheduled plugin tasks completed");
    } catch (error) {
      elizaLogger.error("Error in scheduled plugin commands:", error);
    }
  }

  private async runPlugin(pluginState: PluginState) {
    try {
      const hoursSinceLastRun = this.getHoursSinceLastRun(pluginState);
      
      // Create a mock message to trigger the action with dynamic time period
      const mockMessage = {
        content: {
          text: `${pluginState.name} run on ${hoursSinceLastRun}h`,
          source: "auto_client"
        }
      };
      
      // Find the plugin action
      const pluginAction = this.getPluginAction(pluginState.name);
      
      if (!pluginAction) {
        elizaLogger.error(`${pluginState.name} action not found`);
        return;
      }
      
      // Call the action handler
      elizaLogger.log(`Triggering ${pluginState.name} command for last ${hoursSinceLastRun} hours...`);
      await pluginAction.handler(
        this.runtime,
        mockMessage,
        {}, // empty state
        {}, // empty options
        (response: any) => {
          elizaLogger.log(`${pluginState.name} command completed with response:`, response.text.substring(0, 100) + "...");
        }
      );
      
      // Update last run time
      pluginState.lastRunTime = new Date();
      elizaLogger.log(`${pluginState.name} task completed`);
    } catch (error) {
      elizaLogger.error(`Error in ${pluginState.name} command:`, error);
    }
  }

  private async forceRunAll() {
    elizaLogger.log("Running forced test execution for all plugins...");
    
    // Run each plugin in sequence
    for (const pluginState of Object.values(this.plugins)) {
      await this.runPlugin(pluginState);
    }
    
    elizaLogger.log("Test execution completed for all plugins");
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