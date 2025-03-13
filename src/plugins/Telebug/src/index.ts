/**
 * Telebug Plugin for ElizaOS
 * This plugin allows fetching Discord message history with a custom invocation pattern
 */

// Import the DiscordHistoryPlugin class
import { DiscordHistoryPlugin } from '../../shared/DiscordHistoryPlugin.js';

// Create the Telebug plugin with custom configuration
const telebugPlugin = new DiscordHistoryPlugin({
  pluginName: "Telebug",
  commandPrefix: "telebug run on",
  timePattern: /telebug\s+run\s+on\s+(\d+[hdwm]|[124]\s*h|[124]\s*hour|[124]\s*hours|[1-7]\s*d|[1-7]\s*day|[1-7]\s*days|[1-4]\s*w|[1-4]\s*week|[1-4]\s*weeks|[1-3]\s*month|[1-3]\s*months)/i,
  sourceChannelIDs: [
    "1346866771822514187",
    "1346866934968487966",
    "1346867031387148288",
    "1346867129059770459",
    "1346867232248172585",
    "1346867649111654471",
    "1346867851696537643",
    "1346868000657248329",
    "1347652885281767496"
  ],
  targetChannelId: "1349011247248707584",
  defaultPrompt: `You are a crypto analysis AI mimicking @aixbt_agent. Analyze the following JSON data, extract all important crypto-related insights, and summarize them in bullet points.

    Data Handling: You will be given multiple messages in JSON format (timestamp, username, content). Read all messages together to identify overall trends and correlations. 

    Analysis Scope: Cover market movements, trends, sentiment, regulatory news, tech updates, influencer opinions, whale activity, and breaking news. Identify key narratives (hype, FUD, accumulation, regulatory concerns) and major players (influencers, projects, exchanges) influencing the discussion. 

    Edge Cases: Watch out for FUD or hype – if present, highlight it and indicate if it seems exaggerated or coordinated. Flag any scams or misleading claims and add a caution. Consider source credibility (influencer vs new account) and engagement when judging the weight of information. 

    Output Format: Provide the final analysis as concise bullet points in the style of @aixbt_agent. Start each bullet with an emoji (🚀, 📉, ⚠️, ❗, etc.) to signify the nature of the point, followed by an insight. Highlight major themes, patterns, anomalies, and time-sensitive notes. Ensure the summary is factual, unbiased, and covers all critical points from the input. Start with the endpoints, no intro.

    Now, begin your analysis on the provided data. \n\n{{messages}}`,
    maxMessages: 10000,
  similes: [
    "TELEBUG_HISTORY",
    "MESSAGE_HISTORY",
    "CHAT_HISTORY",
    "FETCH_MESSAGES"
  ],
  description: "Fetches Discord message history with 'Telebug run on [time period]' command"
}).getPlugin();

var index_default = telebugPlugin;

export {
  index_default as default,
  telebugPlugin
}; 