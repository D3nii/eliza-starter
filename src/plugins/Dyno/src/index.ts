/**
 * Dyno Plugin for ElizaOS
 * This plugin allows fetching Discord message history with a custom invocation pattern
 */

// Import the DiscordHistoryPlugin class
import { DiscordHistoryPlugin } from '../../shared/DiscordHistoryPlugin.js';

// Create the Dyno plugin with custom configuration
const dynoPlugin = new DiscordHistoryPlugin({
  pluginName: "Dyno",
  commandPrefix: "dyno run on",
  timePattern: /dyno\s+run\s+on\s+(\d+[hdwm]|[124]\s*h|[124]\s*hour|[124]\s*hours|[1-7]\s*d|[1-7]\s*day|[1-7]\s*days|[1-4]\s*w|[1-4]\s*week|[1-4]\s*weeks|[1-3]\s*month|[1-3]\s*months)/i,
  sourceChannelIDs: [
    "1340337714645434438",
    "1340337744244772864",
    "1340337770811490304",
    "1340335087639859294",
    "1341444737311440916",
    "1340337919298240542",
    "1341443206965100564",
    "1340337937208053760",
    "1340335130064982028",
    "1340335969890467850",
    "1340336009631760455",
    "1340336052434632826",
    "1340336077541609503",
    "1340336185087758397",
    "1340336226808627200",
    "1340336338586833026",
    "1340336393037021307",
    "1340336426642051145",
    "1340336463140622397",
    "1340336501233553551",
    "1340336517842993213",
    "1340336554878566461",
    "1340336601930403870",
    "1340336930134556826",
    "1340336953375195146",
    "1340336986900135956",
    "1340337006911422514",
    "1340337088012222518",
    "1340337120115691611",
    "1340337137786159146",
    "1340337163350573116",
    "1340337200671490089",
    "1340337222687391744",
    "1340337250021408888",
    "1340337390694305822",
    "1340337407270322349",
    "1340337477503946793",
    "1340337548366446692",
    "1340337585163206781",
    "1340338462364274770",
    "1340338485835468852",
    "1340338508157685865",
    "1340338530244624445",
    "1340338543817396245",
    "1340338567179927562",
    "1340338595571040307",
    "1340338611056414731",
    "1340338655037755463",
    "1340338681977901077",
    "1340338725548199980",
    "1340338769685123122",
    "1340338796444520468",
    "1340338834327605278",
    "1340338844184084530",
    "1340338856679182336",
    "1340338883623125073",
    "1340338902208086066",
    "1340338924999933952",
    "1340338941701652612",
    "1340338959162544229"
  ],
  targetChannelId: "1349010551870849138",
  defaultPrompt: `You are a crypto analysis AI mimicking @aixbt_agent. Analyze the following JSON data, extract all important crypto-related insights, and summarize them in bullet points.

    Data Handling: You will be given multiple messages in JSON format (timestamp, username, content). Read all messages together to identify overall trends and correlations. 

    Analysis Scope: Cover market movements, trends, sentiment, regulatory news, tech updates, influencer opinions, whale activity, and breaking news. Identify key narratives (hype, FUD, accumulation, regulatory concerns) and major players (influencers, projects, exchanges) influencing the discussion. 

    Edge Cases: Watch out for FUD or hype – if present, highlight it and indicate if it seems exaggerated or coordinated. Flag any scams or misleading claims and add a caution. Consider source credibility (influencer vs new account) and engagement when judging the weight of information. 

    Output Format: Provide the final analysis as concise bullet points in the style of @aixbt_agent. Start each bullet with an emoji (🚀, 📉, ⚠️, ❗, etc.) to signify the nature of the point, followed by an italicized insight. Highlight major themes, patterns, anomalies, and time-sensitive notes. Ensure the summary is factual, unbiased, and covers all critical points from the input. Start with the endpoints, no intro.

    Now, begin your analysis on the provided data. \n\n{{messages}}`,
    maxMessages: 10000,
  similes: [
    "DYNO_HISTORY",
    "MESSAGE_HISTORY",
    "CHAT_HISTORY",
    "FETCH_MESSAGES"
  ],
  description: "Fetches Discord message history with 'Dyno run on [time period]' command"
}).getPlugin();

var index_default = dynoPlugin;

export {
  index_default as default,
  dynoPlugin
}; 