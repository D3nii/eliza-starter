/**
 * Discord Message Fetcher - Debug Script
 * 
 * This script fetches messages from specified Discord channels
 * for debugging purposes.
 * 
 * Usage:
 * 1. Make sure you have a valid DISCORD_API_TOKEN in your .env file
 * 2. Run: node scripts/fetch-discord-messages.js
 * 3. Optional parameters:
 *    --hours=24 (time period to fetch, default: 24)
 *    --channel=CHANNEL_ID (specific channel to fetch from, default: all channels)
 */

// Import required libraries
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Configuration copied from the Tweetz plugin
const config = {
    // Default time periods in hours
    timePeriods: {
        '1h': 1,
        '4h': 4,
        '1d': 24,
        '1w': 168,     // 7 days * 24 hours
        '1month': 720  // ~30 days * 24 hours
    },

    // Maximum number of messages to fetch
    maxMessages: 10000,
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
    ]
};

// Parse command line arguments
const args = process.argv.slice(2);
let hours = 24; // Default to 24 hours
let specificChannelId = null;

args.forEach(arg => {
    if (arg.startsWith('--hours=')) {
        hours = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--channel=')) {
        specificChannelId = arg.split('=')[1];
    }
});

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel]
});

// Function to fetch Discord message history
async function fetchDiscordHistory(hours, channelId) {
    try {
        console.log(`Fetching Discord history for channel ${channelId} for the last ${hours} hours`);

        // Calculate the timestamp to fetch messages after
        const now = new Date();
        const lookbackTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

        // Fetch the channel
        const channel = await client.channels.fetch(channelId);

        if (!channel || !channel.messages) {
            console.error("Invalid Discord channel or cannot fetch messages");
            return [];
        }

        // Use pagination to fetch messages
        let allMessages = new Map();
        let lastMessageId = null;
        let keepFetching = true;

        // First batch of messages
        let fetchedMessages = await channel.messages.fetch({ limit: 100 });

        // Add messages to our collection if they're after the lookback time
        fetchedMessages.forEach(msg => {
            if (new Date(msg.createdTimestamp) >= lookbackTime) {
                allMessages.set(msg.id, msg);
            }
        });

        // Get the ID of the last message for pagination
        lastMessageId = fetchedMessages.last()?.id;

        // Continue fetching until we reach the limit or run out of messages
        while (keepFetching && lastMessageId && allMessages.size < config.maxMessages) {
            console.log(`Fetched ${allMessages.size} messages so far, fetching more...`);

            // Fetch the next batch of messages
            fetchedMessages = await channel.messages.fetch({
                limit: 100,
                before: lastMessageId
            });

            // If no more messages, stop fetching
            if (fetchedMessages.size === 0) {
                keepFetching = false;
                continue;
            }

            // Add messages to our collection if they're after the lookback time
            let foundOlderThanLookback = false;

            fetchedMessages.forEach(msg => {
                const msgDate = new Date(msg.createdTimestamp);
                if (msgDate >= lookbackTime) {
                    allMessages.set(msg.id, msg);
                } else {
                    foundOlderThanLookback = true;
                }
            });

            // If we found messages older than our lookback time, stop fetching
            if (foundOlderThanLookback) {
                keepFetching = false;
                continue;
            }

            // Update the last message ID for the next iteration
            lastMessageId = fetchedMessages.last()?.id;

            // If we've reached our limit, stop fetching
            if (allMessages.size >= config.maxMessages) {
                keepFetching = false;
            }
        }

        // Fetch active threads in the channel
        if (channel.threads && typeof channel.threads.fetchActive === 'function') {
            try {
                console.log("Fetching active threads...");
                const activeThreads = await channel.threads.fetchActive();

                // For each thread, fetch messages
                for (const [threadId, thread] of activeThreads.threads) {
                    if (allMessages.size >= config.maxMessages) break;

                    console.log(`Fetching messages from thread: ${thread.name}`);

                    // Fetch messages from this thread
                    const threadMessages = await thread.messages.fetch({ limit: 100 });

                    // Add thread messages to our collection if they're after the lookback time
                    threadMessages.forEach(msg => {
                        if (allMessages.size >= config.maxMessages) return;

                        const msgDate = new Date(msg.createdTimestamp);
                        if (msgDate >= lookbackTime) {
                            // Add thread name to message content for context
                            msg.threadName = thread.name;
                            allMessages.set(msg.id, msg);
                        }
                    });
                }
            } catch (threadError) {
                console.error("Error fetching threads:", threadError);
            }
        }

        // Also try to fetch archived threads if possible
        if (channel.threads && typeof channel.threads.fetchArchived === 'function') {
            try {
                console.log("Fetching archived threads...");
                const archivedThreads = await channel.threads.fetchArchived();

                // For each archived thread, fetch messages
                for (const [threadId, thread] of archivedThreads.threads) {
                    if (allMessages.size >= config.maxMessages) break;

                    console.log(`Fetching messages from archived thread: ${thread.name}`);

                    // Fetch messages from this thread
                    const threadMessages = await thread.messages.fetch({ limit: 100 });

                    // Add thread messages to our collection if they're after the lookback time
                    threadMessages.forEach(msg => {
                        if (allMessages.size >= config.maxMessages) return;

                        const msgDate = new Date(msg.createdTimestamp);
                        if (msgDate >= lookbackTime) {
                            // Add thread name to message content for context
                            msg.threadName = thread.name;
                            allMessages.set(msg.id, msg);
                        }
                    });
                }
            } catch (threadError) {
                console.error("Error fetching archived threads:", threadError);
            }
        }

        console.log(`Finished fetching ${allMessages.size} messages (including thread messages) from channel ${channelId}`);
        return Array.from(allMessages.values());
    } catch (error) {
        console.error(`Error fetching Discord message history from channel ${channelId}:`, error);
        return [];
    }
}

// Function to extract text content from an embed
function extractEmbedContent(embed) {
    let embedContent = '';

    // Add title
    if (embed.title) embedContent += `${embed.title}\n`;

    // Add description
    if (embed.description) embedContent += `${embed.description}\n`;

    // Add fields
    if (embed.fields && embed.fields.length > 0) {
        embed.fields.forEach(field => {
            embedContent += `${field.name}: ${field.value}\n`;
        });
    }

    // Add footer
    if (embed.footer && embed.footer.text) embedContent += `${embed.footer.text}\n`;

    return embedContent.trim();
}

// Function to format message history
export function formatMessageHistory(messages) {
    if (!messages || messages.length === 0) {
        return { messages: [] };
    }

    // Sort messages by timestamp (oldest first)
    const sortedMessages = [...messages].sort((a, b) =>
        a.createdTimestamp - b.createdTimestamp
    );

    // Format each message with only the required fields
    const formattedMessages = sortedMessages.map(msg => {
        // Get embed contents
        let embedContents = [];
        if (msg.embeds && msg.embeds.length > 0) {
            msg.embeds.forEach(embed => {
                let parts = [];
                if (embed.title) parts.push(embed.title);
                if (embed.description) parts.push(embed.description);
                if (embed.fields && embed.fields.length > 0) {
                    embed.fields.forEach(field => {
                        parts.push(`${field.name}: ${field.value}`);
                    });
                }
                if (parts.length > 0) {
                    embedContents.push(parts.join(' '));
                }
            });
        }

        // Combine main content with embeds
        let content = msg.content || '';
        if (embedContents.length > 0) {
            content += '\nembeds:' + embedContents.join('. ');
        }

        return {
            username: msg.author?.username || 'Unknown User',
            content: content,
            timestamp: new Date(msg.createdTimestamp).toISOString()
        };
    });

    return JSON.stringify(formattedMessages, null, 2);
}


// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Function to save messages to a file
function saveToFile(channelId, formattedMessages, rawMessages = null) {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const outputDir = join(currentDir, '..', 'discord_history');

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = `channel_${channelId}_${timestamp}.txt`;
    const filePath = join(outputDir, fileName);

    fs.writeFileSync(filePath, formattedMessages);

    // If raw messages provided, save as JSON file as well
    if (rawMessages) {
        // Clean up circular references for JSON serialization
        const cleanedMessages = rawMessages.map(msg => {
            // Extract embed content to append to message content
            let fullContent = msg.content || '';

            // Append embed content to the message content
            if (msg.embeds && msg.embeds.length > 0) {
                msg.embeds.forEach(embed => {
                    const embedContent = extractEmbedContent(embed);
                    if (embedContent) {
                        if (fullContent) fullContent += '\n\n';
                        fullContent += embedContent;
                    }
                });
            }

            // Create a simplified version of the message with essential properties
            const cleanedMsg = {
                id: msg.id,
                content: fullContent, // Now includes embed content
                originalContent: msg.content, // Keep the original content separately
                createdTimestamp: msg.createdTimestamp,
                channelId: msg.channelId,
                guildId: msg.guildId,
                threadName: msg.threadName,
                embeds: msg.embeds.map(embed => ({
                    title: embed.title,
                    description: embed.description,
                    url: embed.url,
                    timestamp: embed.timestamp,
                    color: embed.color,
                    fields: embed.fields,
                    author: embed.author,
                    footer: embed.footer,
                    image: embed.image,
                    thumbnail: embed.thumbnail,
                    video: embed.video
                })),
                attachments: [...msg.attachments.values()].map(att => ({
                    id: att.id,
                    name: att.name,
                    url: att.url,
                    size: att.size,
                    contentType: att.contentType,
                    width: att.width,
                    height: att.height
                })),
                components: msg.components?.map(row => ({
                    type: row.type,
                    components: row.components?.map(comp => ({
                        type: comp.type,
                        label: comp.label,
                        customId: comp.customId,
                        style: comp.style,
                        url: comp.url,
                        emoji: comp.emoji ? {
                            name: comp.emoji.name,
                            id: comp.emoji.id
                        } : null
                    }))
                })),
                author: {
                    id: msg.author?.id,
                    username: msg.author?.username,
                    discriminator: msg.author?.discriminator,
                    bot: msg.author?.bot,
                    system: msg.author?.system
                },
                reactions: [...(msg.reactions?.cache.values() || [])].map(reaction => ({
                    emoji: {
                        name: reaction.emoji.name,
                        id: reaction.emoji.id
                    },
                    count: reaction.count
                })),
                reference: msg.reference,
                stickers: [...(msg.stickers?.values() || [])].map(sticker => ({
                    id: sticker.id,
                    name: sticker.name,
                    format: sticker.format
                })),
                pinned: msg.pinned,
                tts: msg.tts,
                nonce: msg.nonce,
                system: msg.system,
                type: msg.type,
                flags: msg.flags?.toJSON(),
                webhookId: msg.webhookId,
                groupActivityApplication: msg.groupActivityApplication,
                applicationId: msg.applicationId,
                activity: msg.activity,
                crosspostable: msg.crosspostable,
                crosspostedFrom: msg.crosspostedFrom
            };

            return cleanedMsg;
        });

        const jsonFileName = `channel_${channelId}_${timestamp}.json`;
        const jsonFilePath = join(outputDir, jsonFileName);
        fs.writeFileSync(jsonFilePath, JSON.stringify(cleanedMessages, null, 2));
        console.log(`Saved raw JSON data to ${jsonFilePath}`);
    }

    return filePath;
}

// Main function
async function main() {
    console.log(`Starting Discord message fetcher (looking back ${hours} hours)`);

    if (!process.env.DISCORD_API_TOKEN) {
        console.error('ERROR: DISCORD_API_TOKEN is not defined in environment variables');
        console.log('Please make sure you have a .env file with DISCORD_API_TOKEN defined');
        process.exit(1);
    }

    try {
        // Login to Discord
        console.log('Logging in to Discord...');
        await client.login(process.env.DISCORD_API_TOKEN);
        console.log(`Logged in as ${client.user.tag}`);

        // Define channels to fetch from
        const channelsToFetch = specificChannelId
            ? [specificChannelId]
            : config.sourceChannelIDs;

        // Fetch messages from each channel
        console.log(`Will fetch messages from ${channelsToFetch.length} channels`);

        let allMessages = [];
        for (const channelId of channelsToFetch) {
            const channelMessages = await fetchDiscordHistory(hours, channelId);
            console.log(`Fetched ${channelMessages.length} messages from channel ${channelId}`);

            // Format and save individual channel messages
            if (channelMessages.length > 0) {
                const formattedChannelMessages = formatMessageHistory(channelMessages);
                const filePath = saveToFile(channelId, formattedChannelMessages, channelMessages);
                console.log(`Saved messages from channel ${channelId} to ${filePath}`);
            }

            allMessages = allMessages.concat(channelMessages);
        }


        // Format and save all messages combined
        if (allMessages.length > 0) {
            console.log(`Formatting ${allMessages.length} messages in total`);
            const formattedMessages = formatMessageHistory(allMessages);

            const filePath = saveToFile('all_combined', formattedMessages, allMessages);
            console.log(`Saved all combined messages to ${filePath}`);
        } else {
            console.log('No messages found in the specified time period');
        }

    } catch (error) {
        console.error('Error in main function:', error);
    } finally {
        // Always log out and exit
        console.log('Logging out and exiting...');
        client.destroy();
        process.exit(0);
    }
}

// Run the main function
main(); 