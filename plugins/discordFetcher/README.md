# Discord Fetcher Plugin for ElizaOS

This plugin allows fetching Discord message history for different time periods using Discord.js and processing the messages with AI.

## Features

- Fetch Discord message history for specific time periods:
  - 4 hours (`4h`)
  - 1 day (`1d`)
  - 1 week (`1w`)
  - 1 month (`1month`)
- Fetches messages from both main channels and threads (active and archived)
- Provides message history in a simple format suitable for AI input
- **Process fetched messages with AI** for analysis, summarization, or insights
- Uses pagination to fetch more messages than Discord's single request limit
- Sorts messages chronologically (oldest first)
- Shows typing indicator while processing requests

## Installation

### 1. Install Discord.js

First, make sure Discord.js is installed:

```bash
pnpm add discord.js
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```
DISCORD_API_TOKEN="your-discord-bot-token"
```

You can get your Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications):
1. Create a new application or select an existing one
2. Go to the "Bot" section
3. Click "Reset Token" or view your existing token
4. Copy the token (this is shown only once, so save it securely)

### 3. Bot Permissions

Make sure your bot has the following permissions:
- Read Messages/View Channels
- Read Message History

### 4. Add Bot to Your Server

1. Go to the "OAuth2" section in your Discord Developer Portal
2. Select the "bot" scope
3. Select the required permissions
4. Use the generated URL to add the bot to your server

## Usage

To use the plugin, send a message to your ElizaOS agent with one of the following commands:

- "Show me the Discord message history for the last 4h"
- "Get the chat history for the past 1d"
- "Fetch the conversation from the last 1w"
- "Show me the message history for the last 1month"

The plugin will automatically detect the time period and fetch the appropriate message history. While processing, a typing indicator will be shown to provide feedback that the request is being handled.

### AI Processing

The plugin can now process fetched messages with AI. This allows you to:

- Generate summaries of conversations
- Extract key insights or topics
- Analyze sentiment or trends
- Answer questions about the conversation content

The AI processing uses the ElizaOS runtime's AI capabilities and can be customized with different prompts for specific analysis needs.

## Message Format

Messages are returned in a simple format optimized for AI input:

```
Discord Conversation:

Username1: Message content here

[THREAD: Thread Name]

Username2: Thread message here

Username3: Another thread message

[MAIN CHANNEL]

Username4: Back to main channel
```

Thread messages are clearly marked with thread names to maintain context.

## Configuration

The plugin is configured with the following default time periods:

- `4h`: 4 hours
- `1d`: 24 hours (1 day)
- `1w`: 168 hours (7 days)
- `1month`: 720 hours (30 days)

The maximum number of messages fetched is limited to 500 by default.

## Default Channel

By default, the plugin will use a specific channel ID if none is provided in the message context. You can change this default channel ID in the `fetchDiscordHistory` function in `actions.js`.

## AI Processing Customization

You can customize the AI processing by modifying the `processWithAI` function in `actions.js`. This function takes:

- The formatted message history
- The ElizaOS runtime (for accessing AI capabilities)
- An optional custom prompt to guide the AI analysis

## User Experience

The plugin provides a smooth user experience with:

- Initial response acknowledging the request
- Typing indicator while processing (refreshed every 5 seconds)
- Clear formatting of results
- Error handling with user-friendly messages

## Troubleshooting

If you encounter issues with the plugin:

1. Check that your Discord bot token is correctly set in the `.env` file
2. Verify that your bot has the necessary permissions to read message history
3. Make sure the bot is added to your server and can access the channels
4. Check the console logs for any error messages

## License

This plugin is part of the ElizaOS project and is subject to the same license. 