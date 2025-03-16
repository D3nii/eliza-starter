# DisExplain Plugin

The DisExplain plugin enables users to analyze Discord channel history based on specific prompts. It provides powerful insights into channel conversations by leveraging AI to process and analyze message history.

## Features

- Analyze Discord channel conversations with custom prompts
- Configurable time range for analysis (hours, days, weeks, months)
- AI-powered message processing and insights
- Real-time processing and response

## Usage

### Basic Command Structure

```
disexplain <your_prompt> <#channel_id> [time_period]
```

- `your_prompt`: The question or analysis prompt you want to ask about the channel
- `channel_id`: Discord channel ID in the format <#1234567890>
- `time_period`: (Optional) Time period to analyze, defaults to 4 hours

### Time Period Format

You can specify the time period using the following formats:
- Hours: `1h`, `4h`, etc.
- Days: `1d`, `7d`, etc.
- Weeks: `1w`, `2w`, etc.
- Months: `1m`, `3m`, etc.

You can also use full words: `hour`, `day`, `week`, `month` (with optional 's' for plurals)

### Examples

```
disexplain What are the main topics being discussed? <#1234567890>
disexplain Summarize the key decisions made in the last day <#1234567890> 1d
disexplain What are the most active discussion threads? <#1234567890> 1w
```

## Response Format

The plugin will respond with:
1. An initial acknowledgment message
2. A formatted analysis that includes:
   - The time period analyzed
   - AI-generated insights based on your prompt
   - Analysis of the channel messages

## Error Handling

The plugin includes robust error handling for common issues:
- Invalid channel IDs
- Missing permissions
- Network issues
- Invalid time formats

## Technical Details

- Default time period: 4 hours
- Maximum message fetch: 10,000 messages
- Supports multiple Discord message formats
- Real-time processing with progress updates 