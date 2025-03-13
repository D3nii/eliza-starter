/**
 * Quantfase Plugin for ElizaOS
 * This plugin allows fetching Discord message history with a custom invocation pattern
 */

// Import the DiscordHistoryPlugin class
import { DiscordHistoryPlugin } from '../../shared/DiscordHistoryPlugin.js';

// Create the Quantfase plugin with custom configuration
const quantfasePlugin = new DiscordHistoryPlugin({
  pluginName: "Quantfase",
  commandPrefix: "quantfase run on",
  timePattern: /quantfase\s+run\s+on\s+(\d+[hdwm]|[124]\s*h|[124]\s*hour|[124]\s*hours|[1-7]\s*d|[1-7]\s*day|[1-7]\s*days|[1-4]\s*w|[1-4]\s*week|[1-4]\s*weeks|[1-3]\s*month|[1-3]\s*months)/i,
  sourceChannelIDs: [
    "1349022831312371752"
  ],
  targetChannelId: "1349108063650451487",
  defaultPrompt: `You are a crypto analysis AI mimicking @aixbt_agent. Analyze the following JSON data, extract all important crypto-related insights, and summarize them in bullet points.

    Data Handling: You will be given multiple messages in JSON format (timestamp, username, content). Read all messages together to identify overall trends and correlations. 

    Analysis Scope: Cover market movements, trends, sentiment, regulatory news, tech updates, influencer opinions, whale activity, and breaking news. Identify key narratives (hype, FUD, accumulation, regulatory concerns) and major players (influencers, projects, exchanges) influencing the discussion. 

    Edge Cases: Watch out for FUD or hype – if present, highlight it and indicate if it seems exaggerated or coordinated. Flag any scams or misleading claims and add a caution. Consider source credibility (influencer vs new account) and engagement when judging the weight of information. 

    Output Format: Provide the final analysis as concise bullet points in the style of @aixbt_agent. Start each bullet with an emoji (🚀, 📉, ⚠️, ❗, etc.) to signify the nature of the point, followed by an insight. Highlight major themes, patterns, anomalies, and time-sensitive notes. Ensure the summary is factual, unbiased, and covers all critical points from the input. Start with the endpoints, no intro.

    Now, begin your analysis on the provided data. \n\n{{messages}}`,
    maxMessages: 10000,
  similes: [
    "QUANTFASE_HISTORY",
    "MESSAGE_HISTORY",
    "CHAT_HISTORY",
    "FETCH_MESSAGES"
  ],
  description: "Fetches Discord message history with 'Quantfase run on [time period]' command"
}).getPlugin();

var index_default = quantfasePlugin;

export {
  index_default as default,
  quantfasePlugin
}; 