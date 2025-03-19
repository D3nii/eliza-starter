import { parseTimeCommand } from '../../shared/timeUtils.js';
import { fetchDiscordHistory, formatMessageHistory, processWithAI } from '../../shared/discordUtils.js';
import { IAgentRuntime } from '@elizaos/core';
import { sendDynamicWebhookMessage } from '../../shared/discordWebhook.js';
import fs from 'fs';

export const disexplainPlugin = {
    name: "Disexplain",
    description: "Analyzes Discord channel history based on a specific prompt",
    actions: [
        {
            name: "DISEXPLAIN_CHANNEL",
            pattern: /^disexplain\s+(.*?)(?:\s+<#(\d+)>)(?:\s+(\d+[hdwm]|\d+\s*(?:hour|day|week|month)s?))?\s*$/i,
            description: "Analyzes Discord channel history based on a specific prompt",
            examples: [
                [
                    {
                        user: "User1",
                        content: {
                            text: "disexplain What are the main topics being discussed? <#1234567890>"
                        }
                    },
                    {
                        user: "Eliza",
                        content: {
                            text: "# Analysis for the channel\n\n[Analysis of the discussion topics...]"
                        }
                    }
                ]
            ],
            validate: async (runtime: IAgentRuntime, message: any, _state: any) => {
                try {
                    if (!message.content?.text) {
                        console.log("No message content found");
                        return false;
                    }
        
                    const text = message.content.text;
                    
                    // Just check if it starts with disexplain and has a channel ID
                    const hasDisexplain = text.toLowerCase().includes('disexplain');
                    const hasChannelId = text.match(/<#\d+>/);
                    
                    return hasDisexplain && hasChannelId;
                } catch (error) {
                    console.error(`Error in DISEXPLAIN_CHANNEL validate:`, error);
                    return false;
                }
            },
            handler: async (runtime: IAgentRuntime, message: any, state: any, options: any, callback: any) => {
                try {
                    console.log(`*** DISEXPLAIN_CHANNEL handler triggered ***`);
        
                    const text = message.content.text;
                    
                    // Extract the channel ID
                    const channelMatch = text.match(/<#(\d+)>/);
                    if (!channelMatch) {
                        throw new Error("Could not find channel ID in the format <#CHANNEL_ID>");
                    }
                    const channelId = channelMatch[1];
                    
                    // Extract the prompt by removing the disexplain prefix and channel ID
                    let prompt = text.toLowerCase()
                        .replace(/^disexplain\s+/i, '') // Remove prefix
                        .replace(/<#\d+>/, '') // Remove channel ID
                        .replace(/\s+\d+[hdwm]\s*$/, '') // Remove time if present
                        .trim();
                    
                    // Default to 4h if no time specified
                    const timeMatch = text.match(/\s+(\d+[hdwm])\s*$/);
                    const timePeriod = timeMatch ? timeMatch[1] : "4h";
        
                    // Parse the time period
                    const time = parseTimeCommand(timePeriod, /^(.+)$/);
                    console.log(`Parsed time period: ${time.display} (${time.hours} hours)`);
                    console.log("Using channel ID:", channelId);
                    console.log("Extracted prompt:", prompt);
        
                    // Fetch messages from the specified channel
                    const messages = await fetchDiscordHistory(
                        message,
                        time.hours,
                        channelId,
                        runtime,
                        10000
                    );

                    const formattedMessages = formatMessageHistory(messages);
                    console.log(`Fetched ${formattedMessages.length} messages from channel`);

                    // save the formatted messages to a file
                    // fs.writeFileSync('formattedMessages.json', JSON.stringify(formattedMessages, null, 2));
        
                    // Process with AI using the user's prompt
                    const aiPrompt = `Analyze the following Discord conversation and answer this question: ${prompt}\n\nHere are the messages from the last ${time.display}:\n\n{{messages}}`;
        
                    const analysis = await processWithAI(
                        formattedMessages,
                        runtime,
                        aiPrompt
                    );

                    // Send the final response
                    sendDynamicWebhookMessage(channelId, "DisExplain", analysis);
                    console.log("Sent response to channel", channelId);

                    // Send the response to the source channel
                    const successResponse = {
                        text: `Analysis complete. Sent to channel <#${channelId}>`,
                        action: `DISEXPLAIN_CHANNEL_RESPONSE`,
                        source: message.content?.source || "unknown"
                    };

                    callback(successResponse);

                    return analysis;
                } catch (error) {
                    console.error(`Error in DISEXPLAIN_CHANNEL handler:`, error);
        
                    const errorResponse = {
                        text: `Error analyzing channel: ${error.message}`,
                        action: `DISEXPLAIN_CHANNEL_RESPONSE`,
                        source: message.content?.source || "unknown"
                    };
        
                    await callback(errorResponse);
                    return errorResponse;
                }
            },
        }
    ],
    evaluators: []
}

// Log when the plugin is loaded
console.log("DisExplain plugin loaded successfully");

export default disexplainPlugin;