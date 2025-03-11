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