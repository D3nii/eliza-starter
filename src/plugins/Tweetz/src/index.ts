/**
 * Tweetz Plugin for ElizaOS
 * This plugin allows fetching Discord message history with a custom invocation pattern
 */

// Import the DiscordHistoryPlugin class
import { DiscordHistoryPlugin } from '../../shared/DiscordHistoryPlugin.js';

// Create the Tweetz plugin with custom configuration
const tweetzPlugin = new DiscordHistoryPlugin({
  pluginName: "Tweetz",
  commandPrefix: "tweetz run on",
  timePattern: /tweetz\s+run\s+on\s+(\d+[hdwm]|[124]\s*h|[124]\s*hour|[124]\s*hours|[1-7]\s*d|[1-7]\s*day|[1-7]\s*days|[1-4]\s*w|[1-4]\s*week|[1-4]\s*weeks|[1-3]\s*month|[1-3]\s*months)/i,
  sourceChannelIDs: [
    "1346515144263467078",
    "1346515318453047396",
    "1346515484987887617",
    "1346515651136716830",
    "1346515829553893377",
    "1346516032847614103",
    "1346516168424558635",
    "1346516426382381066",
    "1346516839278186647",
    "1346517024058380338",
    "1346517146921861140",
    "1346517338299695214",
    "1346517450845585523",
    "1346517576309538826",
    "1346517693846786109",
    "1346517816831905942",
    "1346517943403679836",
    "1346518073095753811",
    "1346518183124668447",
    "1346518347222618142",
    "1346518455901225020",
    "1346518583949394093",
    "1346518701180063845",
    "1346518851159982142",
    "1346519205968609281",
    "1346519343256703117",
    "1346519500643893359",
    "1346519656017559653",
    "1346519842051854416",
    "1346519969051185254",
    "1346520115625197608",
    "1346520241571758212",
    "1346520363747770530",
    "1346520619667296429",
    "1346520743382482944",
    "1346520864686080060",
    "1347656441586258000",
    "1347676274834804776",
    "1347676349346873385"
  ],
  targetChannelId: "1349009989892833360",
  defaultPrompt: "Analyze the Discord conversation and provide a summary of the conversation. Be sure to include all the details of the conversation, including the names of the people involved and the content of the messages. \n\n{{messages}}",
  maxMessages: 10000,
  similes: [
    "TWEETZ_HISTORY",
    "MESSAGE_HISTORY",
    "CHAT_HISTORY",
    "FETCH_MESSAGES"
  ],
  description: "Fetches Discord message history with 'Tweetz run on [time period]' command"
}).getPlugin();

var index_default = tweetzPlugin;

export {
  index_default as default,
  tweetzPlugin
}; 