# ElizaOS Shared Utilities

This directory contains shared utility functions, helpers, and common code that can be used across multiple ElizaOS plugins.

## Available Utilities

### Time Utilities (`timeUtils.js`)

Functions for working with time periods, formats, and conversions. Particularly useful for plugins that need to handle user-specified time ranges.

**Key Functions:**
- `timeToHours(timePeriod)`: Converts a time period string to hours
- `formatTimePeriod(timePeriod)`: Gets a formatted display string for a time period
- `parseTimeCommand(text, pattern)`: Parses a command for a time period and returns both hours and display format

### Discord Utilities (`discordUtils.js`)

A comprehensive set of utilities for working with Discord, including fetching and processing message history, formatting messages, and interacting with Discord channels.

**Key Functions:**
- `initializeClient()`: Initialize the Discord client
- `formatMessageHistory(messages)`: Format Discord messages into a readable format
- `processWithAI(formattedMessages, runtime, customPrompt)`: Process message history with ElizaOS AI
- `sendDiscordMessage(content, channelId, files)`: Send a message to a Discord channel with automatic chunking for long messages
- `fetchDiscordHistory(message, hours, channelId, runtime, maxMessages)`: Fetch message history from Discord for a specific time period

### Discord History Plugin Class (`DiscordHistoryPlugin.js`)

A reusable plugin class for creating Discord history fetching plugins. It eliminates the need to duplicate actions.js files across different plugins by allowing customization through parameters in the index.ts file.

**Usage:**
```javascript
import { DiscordHistoryPlugin } from '../../shared/DiscordHistoryPlugin.js';

const myPlugin = new DiscordHistoryPlugin({
  pluginName: "MyPlugin",
  commandPrefix: "my command prefix",
  timePattern: /my\s+command\s+pattern\s+(\d+[hdwm])/i,
  sourceChannelIDs: ["channel-id-1", "channel-id-2"],
  targetChannelId: "target-channel-id",
  defaultPrompt: "Custom AI prompt with {{messages}} placeholder",
  maxMessages: 10000,
  similes: ["SIMILAR_ACTION_1", "SIMILAR_ACTION_2"],
  description: "Description of my plugin"
}).getPlugin();

export default myPlugin;
```

**Configuration Options:**
- `pluginName`: The name of the plugin (e.g., "Tweetz", "DiscordFetcher")
- `commandPrefix`: The command prefix for the plugin (e.g., "tweetz run on", "fetch discord history for")
- `timePattern`: The regex pattern for extracting time periods
- `sourceChannelIDs`: Array of Discord channel IDs to fetch messages from
- `targetChannelId`: Discord channel ID to send responses to
- `defaultPrompt`: Custom prompt for the AI
- `maxMessages`: Maximum number of messages to fetch
- `similes`: Array of similar action names
- `description`: Description of the plugin

## How to Use

Import the utilities in your plugin:

```javascript
// Import time utilities
import { timeToHours, formatTimePeriod, parseTimeCommand } from '../../../shared/timeUtils.js';

// Import Discord utilities
import { 
    initializeClient, 
    formatMessageHistory, 
    processWithAI, 
    sendDiscordMessage, 
    fetchDiscordHistory 
} from '../../../shared/discordUtils.js';

// Import DiscordHistoryPlugin class
import { DiscordHistoryPlugin } from '../../../shared/DiscordHistoryPlugin.js';
```

## Creating a New Discord History Plugin

To create a new Discord history plugin with a custom command pattern:

1. Create a new plugin directory with the standard ElizaOS structure
2. In your index.ts file, import and instantiate the DiscordHistoryPlugin class with your custom configuration:

```javascript
// myNewPlugin/src/index.ts
import { DiscordHistoryPlugin } from '../../shared/DiscordHistoryPlugin.js';

const myNewPlugin = new DiscordHistoryPlugin({
  pluginName: "MyNewPlugin",
  commandPrefix: "mynewcommand get history for",
  timePattern: /mynewcommand\s+get\s+history\s+for\s+(\d+[hdwm])/i,
  sourceChannelIDs: ["your-channel-ids-here"],
  targetChannelId: "your-target-channel-id",
  // Other configuration options...
}).getPlugin();

export default myNewPlugin;
```

3. That's it! No need to create or maintain an actions.js file

## Benefits of Using Shared Utilities

1. **Reduced Code Duplication**: Implement common functionalities once and reuse them across plugins
2. **Consistent Behavior**: Ensures all plugins handle similar tasks in the same way
3. **Easier Maintenance**: Changes and fixes can be made in one place rather than in multiple plugins
4. **Improved Performance**: Optimizations benefit all plugins using the shared code
5. **Faster Development**: New plugins can be created more quickly by leveraging existing utilities

## Best Practices

1. **Import Only What You Need**: Import only the specific functions you need to keep your code efficient.

2. **Consistent Time Format**: Use these utilities throughout your plugins for consistent time period handling.

3. **Error Handling**: The functions provide sensible defaults (e.g., 24 hours for unparseable inputs), but consider adding your own validation for critical operations.

4. **Extension**: Feel free to add more utility functions to this library as your plugin ecosystem grows.

## Contributing

When adding new utility functions:

1. Place them in the appropriate file or create a new file for a new category of utilities
2. Add clear JSDoc comments to document parameters and return values
3. Update this README to include documentation for your new functions
4. Consider adding unit tests for complex utility functions 