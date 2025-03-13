# VideoExplain Plugin for ElizaOS

This plugin allows you to get AI-powered explanations of YouTube videos. It uses the ElizaOS video service to process videos and extract their content.

## Features

- Process YouTube videos and get their content
- Extract video title, description, and transcription when available
- Simple command interface: `videxplain me [URL]`
- Supports YouTube URLs

## Usage

To use the plugin, send a message to your ElizaOS agent with the following command:

```
videxplain me [YouTube URL]
```

For example:
```
videxplain me https://www.youtube.com/watch?v=example
```

The plugin will:
1. Download and process the video
2. Extract available information (title, description, transcription)
3. Return a formatted response with the video's content

## Installation

The plugin uses the @elizaos/plugin-video package which should be installed in your ElizaOS environment.

## Error Handling

The plugin includes error handling for:
- Invalid URLs
- Video service unavailability
- Processing errors

If an error occurs, you'll receive a helpful message explaining what went wrong.

## License

This plugin is part of the ElizaOS project and is subject to the same license. 