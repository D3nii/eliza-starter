import {
  Action,
  ModelClass,
  composeContext,
  generateText,
  trimTokens,
  parseJSONObjectFromText,
  IAgentRuntime,
  stringToUuid,
} from "@elizaos/core";

// Configuration options for the custom summarizer
export interface SummarizerConfig {
  // Array of channel IDs to collect messages from (empty means use current channel only)
  sourceChannels: string[];
  // Default lookback period in hours if not specified in message
  defaultLookbackHours: number;
  // Maximum lookback period in hours
  maxLookbackHours: number;
}

// Default configuration
export const defaultSummarizerConfig: SummarizerConfig = {
  sourceChannels: ["pinescript-testing"],
  defaultLookbackHours: 3,
  maxLookbackHours: 24
};

// Global configuration that can be updated
let summarizerConfig: SummarizerConfig = { ...defaultSummarizerConfig };

// Function to update the summarizer configuration
export function configureSummarizer(config: Partial<SummarizerConfig>): void {
  summarizerConfig = {
    ...summarizerConfig,
    ...config
  };
  console.log("Summarizer configuration updated:", summarizerConfig);
}

// Templates
const summarizationTemplate = `# Summarized so far (we are adding to this)
{{currentSummary}}

# Current conversation chunk we are summarizing (includes attachments)
{{memoriesWithAttachments}}

Summarization objective: {{objective}}

# Instructions: Summarize the conversation so far. Return the summary. Do not acknowledge this request, just summarize and continue the existing summary if there is one. Capture any important details to the objective. Only respond with the new summary text.
Your response should be detailed and include all relevant information in a clear, well-structured format with sections and bullet points where appropriate.`;

// Modified date range template to use lookback configuration
const dateRangeTemplate = `# Messages we are summarizing (the conversation is continued after this)
{{recentMessages}}

# Instructions: {{senderName}} is requesting a summary of the conversation. Your goal is to determine their objective, along with the range of dates that their request covers.
The "objective" is a detailed description of what the user wants to summarize based on the conversation. If they just ask for a general summary, you can set the objective to be "a detailed summary of the conversation between all users with key points and conclusions".

The "start" and "end" are the range of dates that the user wants to summarize, relative to the current time. The format is "2 days ago" or "3 hours ago" or "4 minutes ago" or "5 seconds ago", i.e. "<integer> <unit> ago".

If the user specifies a time range like "past 2 hours" or "last 3 days", use that.
If the user doesn't specify a time range, use a default range of "0 minutes ago" to "{{defaultLookbackHours}} hours ago".
Maximum lookback period is {{maxLookbackHours}} hours.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "objective": "<What the user wants to summarize>",
  "start": "0 minutes ago",
  "end": "{{defaultLookbackHours}} hours ago",
  "channels": []
}
\`\`\`

If the user specifies specific channels to summarize, include those channel IDs in the "channels" array. Otherwise, leave it as an empty array to use the default channels.
`;

// Modified helper function to determine date range from user request and extract channel information
const getDateRange = async (runtime, message, state) => {
  state = await runtime.composeState(message);

  // Add configuration to state for template
  state.defaultLookbackHours = summarizerConfig.defaultLookbackHours;
  state.maxLookbackHours = summarizerConfig.maxLookbackHours;
  
  console.log(`Default lookback hours: ${summarizerConfig.defaultLookbackHours}, Max lookback: ${summarizerConfig.maxLookbackHours}`);
  
  const context = composeContext({
    state,
    template: dateRangeTemplate
  });
  
  for (let i = 0; i < 3; i++) {
    const response = await generateText({
      runtime,
      context,
      modelClass: ModelClass.SMALL
    });
    
    const parsedResponse = parseJSONObjectFromText(response);
    if (parsedResponse) {
      if (parsedResponse.objective && parsedResponse.start && parsedResponse.end) {
        const startIntegerString = parsedResponse.start.match(/\d+/)?.[0];
        const endIntegerString = parsedResponse.end.match(/\d+/)?.[0];
        
        const multipliers = {
          second: 1 * 1000,
          minute: 60 * 1000,
          hour: 3600 * 1000,
          day: 86400 * 1000
        };
        
        const startMultiplier = parsedResponse.start.match(/second|minute|hour|day/)?.[0];
        const endMultiplier = parsedResponse.end.match(/second|minute|hour|day/)?.[0];
        
        const startInteger = startIntegerString ? Number.parseInt(startIntegerString) : 0;
        const endInteger = endIntegerString ? Number.parseInt(endIntegerString) : 0;
        
        // Enforce maximum lookback
        const maxLookbackMs = summarizerConfig.maxLookbackHours * 3600 * 1000;
        let startTime = startInteger * multipliers[startMultiplier];
        if (startTime > maxLookbackMs) {
          startTime = maxLookbackMs;
        }
        
        // Ensure we have a reasonable timeframe - at least 24 hours
        if (startTime < 24 * 3600 * 1000) {
          console.log(`Start time too short (${startTime}ms), extending to at least 24 hours`);
          startTime = 24 * 3600 * 1000;
        }
        
        const endTime = endInteger * multipliers[endMultiplier];
        
        // Calculate actual dates
        const endDate = new Date(Date.now() - endTime);
        const startDate = new Date(Date.now() - startTime);
        
        console.log(`Date range calculation:`);
        console.log(`- Start time ago: ${startTime}ms ago => ${startDate.toISOString()}`);
        console.log(`- End time ago: ${endTime}ms ago => ${endDate.toISOString()}`);
        
        // Fixed: Make sure start time is before end time in chronological order
        // In date terms, the "start" is earlier/older than the "end"
        let fixedStart, fixedEnd;
        
        // Ensure chronological order
        if (startDate < endDate) {
          // This is correct chronological order
          fixedStart = Date.now() - startTime;
          fixedEnd = Date.now() - endTime;
        } else {
          // Dates are reversed, swap them
          console.log("Date range is reversed, swapping start and end for correct chronological order");
          fixedStart = Date.now() - endTime;
          fixedEnd = Date.now() - startTime;
        }
        
        console.log(`Fixed chronological range: ${new Date(fixedStart).toISOString()} to ${new Date(fixedEnd).toISOString()}`);
        
        parsedResponse.start = fixedStart;
        parsedResponse.end = fixedEnd;
        
        return parsedResponse;
      }
    }
  }
  
  // If we get here, we couldn't get a valid response from the LLM
  // Fall back to a default range - using the last 30 days
  console.log("Failed to get date range from LLM, using default (last 30 days)");
  
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 3600 * 1000);
  
  console.log(`Default date range: ${new Date(thirtyDaysAgo).toISOString()} to ${new Date(now).toISOString()}`);
  
  return {
    objective: "a detailed summary of the conversation between all users with key points and conclusions",
    start: thirtyDaysAgo,
    end: now,
    channels: []
  };
};

// Function to split large texts into chunks
async function splitChunks(text, maxChunkSize, overlap = 200) {
  // Simple split by length
  const chunks = [];
  let position = 0;
  
  while (position < text.length) {
    const chunk = text.substring(position, position + maxChunkSize);
    chunks.push(chunk);
    position += maxChunkSize - overlap;
  }
  
  return chunks;
}

// Helper type for actor details
interface Actor {
  id: string;
  name: string;
  username: string;
}

// Helper function to get formatted user information
function formatUserInfo(userId: string): { displayName: string, username: string } {
  // This is a simple fallback implementation
  // In a real implementation, you might want to fetch actual user details from Discord or other sources
  return {
    displayName: `User-${userId.substring(0, 4)}`,
    username: ''
  };
}

// Add a flag to prevent infinite recursion, but with a timestamp to track when it was set
let directHandlerStartTime = 0;
const DIRECT_HANDLER_TIMEOUT_MS = 5000; // 5 seconds timeout

// Function to check if we're currently processing a direct handler
function isDirectHandlerActive() {
  // If it's been more than our timeout since the handler started, consider it inactive
  if (directHandlerStartTime > 0 && Date.now() - directHandlerStartTime > DIRECT_HANDLER_TIMEOUT_MS) {
    console.log("Direct handler timeout expired, resetting flag");
    directHandlerStartTime = 0;
    return false;
  }
  return directHandlerStartTime > 0;
}

// Custom summarization action
export const customSummarizeAction: Action = {
  name: "FORCE_SUMMARIZE",
  similes: [
    "TLDR",
    "TL_DR",
    "SUMMARY",
    "RECAP",
    "SUMMARIZE",
    "LASSAN",
    "CUSTOM_SUMMARIZE_CONVERSATION"
  ],
  description: "Custom implementation for summarizing conversations with improved formatting and support for Discord messages.",
  
  validate: async (runtime, message, _state) => {
    // Debug the message we're validating
    console.log("VALIDATION - Message text:", message.content?.text);
    
    // Skip if there's no text content
    if (!message.content?.text) {
      console.log("VALIDATION - No text content, skipping");
      return false;
    }
    
    const text = message.content.text.toLowerCase().trim();
    console.log("VALIDATION - Normalized text:", text);
    
    // Check if this appears to be a Discord message
    const isDiscord = message.content.source === 'discord' || 
                      (message.content?.metadata && typeof message.content.metadata === 'object' && 
                       'platform' in message.content.metadata && 
                       message.content.metadata.platform === 'discord');
    if (isDiscord) {
      console.log("VALIDATION - Message is from Discord");
      
      // For Discord messages with mentions, we need special handling
      if (text.includes("<@") && isSummaryCommand(text) && !isDirectHandlerActive()) {
        console.log("VALIDATION - Discord message with @mention and summary command detected");
        
        // Run this asynchronously to not block the validation
        (async () => {
          try {
            // Check again to prevent race conditions
            if (isDirectHandlerActive()) {
              console.log("Direct handler is already active, skipping new direct handler");
              return;
            }
            
            // Set flag with timestamp
            directHandlerStartTime = Date.now();
            console.log(`*** Directly invoking summarize handler for Discord @mention message at ${directHandlerStartTime} ***`);
            
            // Create a dynamic callback that handles response delivery
            // The key thing is to SHOW the direct response to the user in any way possible
            const responseHandler = (response) => {
              console.log("Direct handler generated response:", response);
              
              // For Discord, we'll try multiple mechanisms to get the response through
              
              // 1. First try: agent's response mechanism for Discord
              if (typeof (runtime as any).handleResponse === 'function') {
                try {
                  console.log("Using runtime.handleResponse to deliver message");
                  return (runtime as any).handleResponse(message, response);
                } catch (e) {
                  console.error("Error using handleResponse:", e);
                }
              }
              
              // 2. Second try: try to force a regular message to send using the default
              // Eliza response system with the original message that triggered the handler
              if (typeof (runtime as any).processMessage === 'function') {
                try {
                  console.log("Sending summary as a standard message response");
                  
                  // Create a clean response object
                  const cleanResponse = {
                    text: `Here's the summary you requested:\n\n${response.text || "No messages found in the time range."}`,
                    roomId: message.roomId,
                    userId: runtime.agentId || "eliza"
                  };
                  
                  // Directly return this response
                  return Promise.resolve([cleanResponse]);
                } catch (e) {
                  console.error("Error creating processed response:", e);
                }
              }
              
              // 3. Third try: just console log the response, which should be visible in the logs
              console.log("SUMMARY RESPONSE (please check logs):", response.text);
              return Promise.resolve();
            };
            
            // Call the direct handler with our response handler  
            await directSummarizeHandler(runtime, message, responseHandler);
            
            // Reset the flag when done
            console.log("Direct handler completed, resetting flag");
            directHandlerStartTime = 0;
          } catch (error) {
            console.error("Error calling direct handler for @mention:", error);
            directHandlerStartTime = 0; // Reset flag on error
          }
        })();
      }
    }
    
    // Direct commands that should trigger this action
    const exactCommands = [
      "lassan",
      "tldr please",
      "tldr",
      "tl;dr", 
      "summarize",
      "custom summarize",
      "create a summary",
      "make a summary"
    ];
    
    // Log all the commands we're checking against
    console.log("VALIDATION - Checking against commands:", exactCommands);
    
    // First check for exact matches
    for (const command of exactCommands) {
      // Check for exact match or match at the end of text (allowing for @mentions before)
      const isExactMatch = text === command;
      const isEndMatch = text.endsWith(` ${command}`);
      const isStartMatch = text.startsWith(`${command} `);
      const isCommandInText = text.includes(command);
      
      if (isExactMatch || isEndMatch || isStartMatch || isCommandInText) {
        console.log(`VALIDATION - Matched command "${command}" (exact: ${isExactMatch}, end: ${isEndMatch}, start: ${isStartMatch}, commandInText: ${isCommandInText})`);        
        return true;
      }
    }
    
    // Keywords that trigger this action
    const keywords = [
      "custom summary", "custom recap",
      "summarize for me", "give me a recap", "provide a summary", 
      "summary", "recap"
    ];
    
    // Check for keyword matches
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        console.log(`VALIDATION - Matched keyword "${keyword}"`);
        return true;
      }
    }
    
    console.log("VALIDATION - No match found");
    return false;
  },
  handler: async (runtime, message, state, options, callback) => {
    try {
      console.log("*** FORCE_SUMMARIZE handler triggered ***");
      
      // Check if this is a Discord message
      const isDiscord = message.content?.source === 'discord' || 
                       (message.content?.metadata && typeof message.content.metadata === 'object' && 
                        'platform' in message.content.metadata && 
                        message.content.metadata.platform === 'discord');
      
      if (isDiscord) {
        console.log("*** FORCE_SUMMARIZE handler detected Discord message ***");
      }
      
      // If we received an empty state, make sure to compose it
      if (!state || Object.keys(state).length === 0) {
        console.log("No state provided, composing state");
        state = await runtime.composeState(message);
      }
      
      // Make sure we have a valid callback function
      if (typeof callback !== 'function') {
        console.error("Callback is not a function:", callback);
        // We'll use a default implementation that does nothing
        // This should never happen in normal operation
        callback = () => Promise.resolve([]); // Add a default callback function that returns an empty array
        console.log("Using default empty callback function");
      }

      // Send an immediate response to confirm the handler is working
      const initialResponse = {
        text: "Starting summarization process... This might take a moment.",
        action: "SUMMARIZATION_RESPONSE",
        source: message.content?.source || "unknown",
        attachments: []
      };
      
      // Send the initial response
      try {
        await callback(initialResponse);
        console.log("Sent initial response");
      } catch (callbackError) {
        console.error("Error sending initial response:", callbackError);
      }
      
      // Continue with the rest of the handler...
      
      // Prepare the response data structure
      const callbackData = {
        text: "",
        action: "SUMMARIZATION_RESPONSE",
        source: message.content?.source || "unknown",
        attachments: []
      };
      
      // Safely access roomId
      const roomId = message.roomId || (message.content && message.content.roomId);
      if (!roomId) {
        console.error("No roomId found in message:", message);
        callbackData.text = "I couldn't determine which conversation to summarize. Please try again.";
        await callback(callbackData);
        return callbackData;
      }
      
      console.log("Processing in roomId:", roomId);
      
      // Get date range from the message
      const dateRange = await getDateRange(runtime, message, state);
      if (!dateRange) {
        console.error("Couldn't get date range from message");
        callbackData.text = "I'm sorry, I couldn't determine what time range to summarize. Please try asking again with more specific timeframe.";
        await callback(callbackData);
        return callbackData;
      }
      
      console.log("Date range determined:", dateRange);
      const { objective, start, end, channels } = dateRange;
      
      try {
        // Determine which channels to collect messages from
        const sourceChannels = channels.length > 0 
          ? channels 
          : (summarizerConfig.sourceChannels.length > 0 
            ? summarizerConfig.sourceChannels 
            : [roomId]);
        
        console.log("Current roomId:", roomId);
        console.log("Config sourceChannels:", summarizerConfig.sourceChannels);
        console.log("Collecting messages from channels:", sourceChannels);
        
        // Try both the specified channel and the current room to increase chances of finding messages
        let allMemories = [];
        
        // First, try the current room if it's not already in the list
        if (!sourceChannels.includes(roomId)) {
          sourceChannels.push(roomId);
          console.log(`Added current roomId ${roomId} to the source channels`);
        }
        
        for (const channelId of sourceChannels) {
          console.log(`Fetching messages for channel: ${channelId}`);
          console.log(`Time range: ${new Date(Number.parseInt(start)).toISOString()} to ${new Date(Number.parseInt(end)).toISOString()}`);
          
          const channelMemories = await runtime.messageManager.getMemories({
            roomId: channelId,
            start: Number.parseInt(start),
            end: Number.parseInt(end),
            count: 10000,
            unique: false
          });
          
          console.log(`Retrieved ${channelMemories.length} messages from channel ${channelId}`);
          
          if (channelMemories.length === 0) {
            // Try a longer lookback period if no messages were found
            console.log("No messages found with initial date range, trying extended lookback");
            const extendedStart = Date.now() - (60 * 24 * 3600 * 1000); // 60 days
            
            const extendedMemories = await runtime.messageManager.getMemories({
              roomId: channelId,
              start: extendedStart,
              end: Number.parseInt(end),
              count: 10000,
              unique: false
            });
            
            console.log(`Extended search: Retrieved ${extendedMemories.length} messages from channel ${channelId} over last 60 days`);
            
            // Use the extended results if we found something
            if (extendedMemories.length > 0) {
              console.log("Using extended date range results");
              allMemories = allMemories.concat(extendedMemories.map(memory => ({
                memory,
                channelId
              })));
              continue;
            }
          }
          
          // Add any messages we found
          allMemories = allMemories.concat(channelMemories.map(memory => ({
            memory,
            channelId
          })));
        }
        
        // Sort memories by timestamp
        allMemories.sort((a, b) => {
          return new Date(a.memory.timestamp).getTime() - new Date(b.memory.timestamp).getTime();
        });
        
        console.log(`Retrieved a total of ${allMemories.length} messages for summarization`);

        // Format the messages for summarization
        const formattedMemories = allMemories.map((item) => {
          const { memory, channelId } = item;
          const userInfo = formatUserInfo(memory.userId);
          
          const attachments = memory.content.attachments?.map((attachment) => {
            return `---
Attachment: ${attachment.id}
${attachment.description || ''}
${attachment.text || ''}
---`;
          }).join("\n") || "";
          
          // Include channel information if multiple channels
          const channelInfo = sourceChannels.length > 1 ? `[Channel: ${channelId}] ` : "";
          
          return `${channelInfo}${userInfo.displayName} ${userInfo.username ? `(${userInfo.username})` : ''}: ${memory.content.text || ''}
${attachments}`;
        }).join("\n");
        
        // Handle empty conversation case
        if (!formattedMemories || formattedMemories.trim() === "") {
          callbackData.text = "There were no messages in the specified time range to summarize.";
          await callback(callbackData);
          return callbackData;
        }
        
        // Prepare for summarization
        let currentSummary = "";
        
        // Use a fixed chunk size instead of trying to get model settings
        const chunkSize = 3000; // Default chunk size appropriate for most models
        
        // Split into chunks if needed
        const chunks = await splitChunks(formattedMemories, chunkSize, 0);
        
        // Build channel description for summary
        let channelDescription = "";
        if (sourceChannels.length === 1) {
          channelDescription = `channel ${sourceChannels[0]}`;
        } else {
          channelDescription = `channels ${sourceChannels.join(", ")}`;
        }
        
        // Set state for the template
        state.memoriesWithAttachments = formattedMemories;
        state.objective = objective;
        
        // Process each chunk and build the summary
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          state.currentSummary = currentSummary;
          state.currentChunk = chunk;
          
          const template = await trimTokens(
            summarizationTemplate,
            chunkSize + 500,
            runtime
          );
          
          const context = composeContext({
            state,
            template
          });
          
          const summary = await generateText({
            runtime,
            context,
            modelClass: ModelClass.SMALL
          });
          
          currentSummary = currentSummary + "\n" + summary;
        }
        
        // Handle failed summarization
        if (!currentSummary) {
          callbackData.text = "I'm sorry, I wasn't able to generate a summary.";
          await callback(callbackData);
          return callbackData;
        }
        
        // Clean up and format the summary
        const finalSummary = currentSummary.trim();
        
        // For short summaries, just return them directly
        if (finalSummary.split("\n").length < 4 || finalSummary.split(" ").length < 100) {
          callbackData.text = `# Conversation Summary\n\n${finalSummary}`;
          await callback(callbackData);
        } 
        // For longer summaries, save as a file and attach
        else {
          const summaryFilename = `content/conversation_summary_${Date.now()}.txt`;
          await runtime.cacheManager.set(summaryFilename, 
            `# Conversation Summary\n\n` +
            `From: ${new Date(Number.parseInt(start)).toLocaleString()}\n` +
            `To: ${new Date(Number.parseInt(end)).toLocaleString()}\n` +
            `Channels: ${channelDescription}\n\n` +
            `## Objective\n${objective}\n\n` +
            `## Summary\n${finalSummary}`
          );
          
          callbackData.text = `I've created a detailed summary of the conversation from ${new Date(Number.parseInt(start)).toLocaleString()} to ${new Date(Number.parseInt(end)).toLocaleString()} in ${channelDescription}.`;
          
          await callback(callbackData, [summaryFilename]);
        }
        
        return callbackData;
      } catch (error) {
        console.error("Error in custom summarize handler:", error);
        callbackData.text = "I encountered an error while trying to summarize the conversation. Please try again later.";
        await callback(callbackData);
        return callbackData;
      }
    } catch (error) {
      console.error("Critical error in FORCE_SUMMARIZE handler:", error);
      try {
        await callback({
          text: "I encountered an error while trying to summarize the conversation. Please try again later.",
          action: "SUMMARIZATION_RESPONSE",
          source: message.content?.source || "unknown",
          attachments: []
        });
      } catch (callbackError) {
        console.error("Error calling callback:", callbackError);
      }
      return {
        text: "Error in summarization",
        action: "SUMMARIZATION_RESPONSE",
        source: message.content?.source || "unknown"
      };
    }
  },
  
  examples: [
    [
      {
        user: "User1",
        content: {
          text: "custom summarize our conversation please"
        }
      },
      {
        user: "Eliza",
        content: {
          text: "I've created a detailed summary of the conversation from [date] to [date]."
        }
      }
    ]
  ]
};

// Add a direct handler function that can be called directly from other places
export async function directSummarizeHandler(runtime, message, callback) {
  console.log("*** DIRECT summarize handler called ***");
  
  try {
    // Check if a different handler is already running for more than 1 second
    // We allow a newly started handler to run to avoid race conditions
    const handlerRuntime = Date.now() - directHandlerStartTime;
    if (directHandlerStartTime > 0 && handlerRuntime > 1000) {
      console.log(`A direct handler has already been running for ${handlerRuntime}ms, skipping recursive call`);
      return {
        text: "Already processing a summary request",
        action: "DIRECT_SUMMARIZATION",
        source: message.content?.source || "unknown"
      };
    }
    
    // If this is the first handler or it just started (within 1 second), proceed
    console.log("Starting direct handler execution");
    
    // If no callback is provided, create a default that will at least log the response
    if (typeof callback !== 'function') {
      console.log("No callback provided, using console logging as fallback");
      callback = (response) => {
        console.log("SUMMARY RESULT (no callback provided):", response);
        
        // Try to find system ways to send the response
        if (typeof (runtime as any).handleResponse === 'function') {
          console.log("Using runtime.handleResponse");
          return (runtime as any).handleResponse(message, response);
        }
        
        // Log it at minimum
        console.log("No handler available. Summary result:", response.text);
        return Promise.resolve();
      };
    }
    
    // Make sure the message has a roomId
    if (!message.roomId && message.content && message.content.roomId) {
      message.roomId = message.content.roomId;
      console.log(`Added roomId from content: ${message.roomId}`);
    }
    
    // Send a basic response if callback is working
    try {
      await callback({
        text: "I'm starting the summarization process (via direct handler)...",
        action: "DIRECT_SUMMARIZATION",
        source: message.content?.source || "unknown"
      });
      console.log("Initial response sent successfully");
    } catch (e) {
      console.error("Error sending initial response:", e);
    }
    
    try {
      // Use the actual handler from our action
      const result = await customSummarizeAction.handler(
        runtime, 
        message, 
        null, // null state - it will be composed in the handler
        {}, // Empty options
        callback
      );
      
      return result;
    } finally {
      // Always log when we're done
      console.log("Direct handler execution completed");
      // Don't reset the flag here - we'll let the caller reset it
    }
  } catch (error) {
    console.error("Error in direct summarize handler:", error);
    
    if (typeof callback === 'function') {
      await callback({
        text: "Sorry, I encountered an error while trying to summarize.",
        action: "ERROR_RESPONSE",
        source: message.content?.source || "unknown"
      });
    }
    
    return {
      text: "Error in direct summarization handler",
      action: "ERROR_RESPONSE",
      source: message.content?.source || "unknown"
    };
  }
}

// Helper function to check if text contains a summary command
export function isSummaryCommand(text) {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase().trim();
  
  // List of commands that should trigger summarization
  const commands = [
    "lassan",
    "tldr please",
    "tldr",
    "tl;dr", 
    "summarize",
    "custom summarize",
    "create a summary",
    "make a summary",
    "custom summary", 
    "custom recap",
    "summarize for me", 
    "give me a recap", 
    "provide a summary", 
    "summary", 
    "recap"
  ];
  
  // Check if any command is in the text
  return commands.some(cmd => normalizedText.includes(cmd));
}
