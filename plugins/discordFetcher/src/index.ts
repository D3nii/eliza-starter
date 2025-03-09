/**
 * Discord Fetcher Plugin for ElizaOS
 * This plugin allows fetching Discord message history for different time periods
 */

// Step 2: Import the Discord Features and Actions
import { evaluators, actions } from "./actions.js";

// Step 1: Input = Connection from ElizaOS, Process = All Logic Above, Output = Export {}
var discordFetcherPlugin = {
  name: "Discord Fetcher Plugin",
  description: "Discord Fetcher Plugin for ElizaOS - Fetch message history for different time periods (4h, 1d, 1w, 1month)",
  evaluators,
  actions,
  providers: []
};
var index_default = discordFetcherPlugin;
export {
  index_default as default,
  discordFetcherPlugin
};