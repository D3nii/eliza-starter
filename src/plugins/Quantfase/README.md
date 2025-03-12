# Quantfase Plugin for ElizaOS

This plugin allows fetching Discord message history for different time periods using Discord.js and processing the messages with AI. It uses a custom invocation pattern: `Quantfase run on [time period]`.

## Features

- Fetch Discord message history for specific time periods using a custom invocation:
  - `Quantfase run on 1h` (1 hour)
  - `Quantfase run on 2h` (2 hours)
  - `Quantfase run on 4h` (4 hours)
  - `Quantfase run on 1d` (1 day)
  - `Quantfase run on 3d` (3 days)
  - `Quantfase run on 1w` (1 week)
  - `Quantfase run on 2w` (2 weeks)
  - `Quantfase run on 1month` (1 month)
- Supports flexible time period specifications (e.g., "3 hours", "2 days", "1 week")
- Uses shared time utilities from `src/plugins/shared/timeUtils.js` for consistent time handling
- Fetches messages from both main channels and threads (active and archived)
- Provides message history in a simple format suitable for AI input
- Processes fetched messages with AI for analysis and summarization
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

To use the plugin, send a message to your ElizaOS agent with the following command:

```
Quantfase run on [time period]
```

Where `[time period]` can be:
- `1h`, `2h`, `3h`, `4h`, `6h`, `8h`, `12h` (hours)
- `1d`, `2d`, `3d` (days)
- `1w`, `2w` (weeks)
- `1month` (month)

You can also use more natural language formats:
- `Quantfase run on 3 hours`
- `Quantfase run on 2 days`
- `Quantfase run on 1 week`
- `Quantfase run on 1 month`

The plugin will automatically detect the time period and fetch the appropriate message history.

### Examples

- `Quantfase run on 4h` - Fetch and analyze Discord messages from the last 4 hours
- `Quantfase run on 1d` - Fetch and analyze Discord messages from the last day
- `Quantfase run on 2w` - Fetch and analyze Discord messages from the last 2 weeks

## Configuration

The plugin is configured with the following default time periods (in hours):

- '1h': 1 hour
- '2h': 2 hours
- '3h': 3 hours
- '4h': 4 hours
- '6h': 6 hours
- '8h': 8 hours
- '12h': 12 hours
- '1d': 24 hours (1 day)
- '2d': 48 hours (2 days)
- '3d': 72 hours (3 days)
- '1w': 168 hours (7 days)
- '2w': 336 hours (14 days)
- '1month': 720 hours (30 days)

The maximum number of messages fetched is limited to 10,000 by default.

## Source and Target Channels

By default, the plugin will fetch messages from the following Discord channels:

- Source Channels: The channels from which to fetch messages (configured in the `config.sourceChannelIDs` array)
- Target Channel: The channel to which responses might be sent, if needed (configured in `config.targetChannelId`)

You can modify these channel IDs in the plugin configuration.

## AI Processing

The plugin processes fetched messages with AI using ElizaOS runtime's AI capabilities. The default prompt instructs the AI to analyze the conversation and provide a summary, including details about participants and message content.

## Shared Utilities

This plugin uses the shared time utilities from `src/plugins/shared/timeUtils.js` to handle time period parsing. This allows for consistent time handling across multiple plugins.

The shared utilities provide:

1. `timeToHours(timePeriod)` - Converts time period strings to hours
2. `formatTimePeriod(timePeriod)` - Formats time periods for display
3. `parseTimeCommand(text, pattern)` - Parses commands with time periods

By using these shared utilities, we:
- Avoid code duplication across plugins
- Ensure consistent time parsing behavior
- Make it easier to maintain and update time-related logic

## Troubleshooting

If you encounter issues with the plugin:

1. Check that your Discord bot token is correctly set in the `.env` file
2. Verify that your bot has the necessary permissions to read message history
3. Make sure the bot is added to your server and can access the specified channels
4. Check the console logs for any error messages

## License

This plugin is part of the ElizaOS project and is subject to the same license. 