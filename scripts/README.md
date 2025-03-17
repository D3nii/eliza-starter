# Discord Message Fetcher Script

This directory contains scripts for working with the ElizaOS project.

## fetch-discord-messages.js

This script fetches messages from specified Discord channels for debugging purposes. It helps troubleshoot the Tweetz plugin by allowing you to see exactly what messages are being retrieved from Discord.

### Prerequisites

- Node.js v22 or higher
- Discord.js v14 or higher
- A valid Discord API token in your `.env` file

### Usage

```bash
# Basic usage - fetches messages from all configured channels for the last 24 hours
node scripts/fetch-discord-messages.js

# Fetch messages from the last 4 hours
node scripts/fetch-discord-messages.js --hours=4

# Fetch messages from a specific channel only
node scripts/fetch-discord-messages.js --channel=1346515144263467078

# Combine parameters
node scripts/fetch-discord-messages.js --hours=48 --channel=1346515144263467078
```

### Output

The script will:

1. Fetch messages from each specified channel
2. Save messages from each individual channel to separate files
3. Save all combined messages to one file
4. Place all files in the `discord_history` directory at the project root

Each channel will produce two files:
- A readable text file (`.txt`) with formatted message content
- A JSON file (`.json`) with raw message data for technical debugging

#### Message Content Captured

The script captures comprehensive message data including:

- Basic text content
- Embeds with all their fields (title, description, fields, author, etc.)
- Attachments with URLs, sizes, and content types
- Stickers
- Reactions/emojis
- Interactive components (buttons, select menus)
- Reference data (for reply chains)
- Thread information
- Timestamps and author information

#### Special Content Handling

**Embed Content Appending:** 
- All embed content (titles, descriptions, fields, etc.) is appended to the message content for easier text analysis
- This makes it easier to use the messages for AI processing or searching
- In the JSON output, both the combined content (`content`) and original message text (`originalContent`) are preserved

File naming format:
`channel_CHANNEL_ID_TIMESTAMP.txt` and `channel_CHANNEL_ID_TIMESTAMP.json`

### Troubleshooting

- If you see "ERROR: DISCORD_API_TOKEN is not defined", make sure you have the token in your `.env` file
- If channels show "Invalid Discord channel", check that your bot has access to those channels
- If message content is empty but embeds/attachments exist, ensure your bot has the proper intents enabled
- For other issues, check the Discord.js documentation 

## test-dynamic-webhook.js

Tests the dynamic Discord webhook functionality. This script demonstrates how to use the `sendDynamicWebhookMessage` function to dynamically create and use webhooks for Discord channels.

### Setup

Create a `.env` file in the project root with your Discord bot token:

```
DISCORD_API_TOKEN=your_discord_bot_token_here
```

The bot token needs to have permissions to manage webhooks in the target channel.

### Usage

```bash
node scripts/test-dynamic-webhook.js <channelId> <message>
```

Example:
```bash
node scripts/test-dynamic-webhook.js 123456789012345678 "Hello, this is a test message!"
```

### Features
- Dynamically creates a webhook in the specified channel if one doesn't exist
- Reuses existing webhooks created by the bot
- Sends messages with customizable sender name and avatar
- Handles message chunking for long messages
- Supports sending to threads within channels
- Provides fine-grained control over allowed mentions
- Implements proper error handling for Discord API responses

### Advanced Options

The script supports all options from the Discord Webhook API, including:

- `threadId`: Send messages to a specific thread in the channel
- `allowedMentions`: Control what mentions are parsed in the message
- `embeds`: Add rich embeds to your messages
- `components`: Add interactive components like buttons

### API Reference

This implementation follows the official Discord API documentation:
- [Get Channel Webhooks](https://discord.com/developers/docs/resources/webhook#get-channel-webhooks)
- [Create Webhook](https://discord.com/developers/docs/resources/webhook#create-webhook)
- [Execute Webhook](https://discord.com/developers/docs/resources/webhook#execute-webhook) 