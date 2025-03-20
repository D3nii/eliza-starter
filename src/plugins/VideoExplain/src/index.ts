import { IAgentRuntime, generateText, composeContext, ModelClass } from "@elizaos/core";
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from "openai";
import { sendMessageToThread } from "../../shared/discordUtils.js";

// Whitelisted channels
const WHITELISTED_CHANNELS = [
  "2dc3302d-9ff9-0541-9c44-b88332d718e0", // test
  "64a596dd-7568-09dd-9384-d3a36c540f1e" // videos
];

// Prompt for the video explain plugin
const PROMPT = `
You're a Crypto expert. 

Structurize the following and be as DETAILED, AND TECHNICAL as POSSIBLE. 
Please get the name from the channel name and use it to explain. "name" says this, "name" explains, "name" thinks, in views of "name", etc.
Don't include Introduction/Overview and Conclusions. I DON'T NEED THEM. DON'T INCLUDE THEM.

And return in markdown format, don't include \`\`\` or "markdown" in the response.

The user might ask you for a specific aspect of the video. You should explain that specific aspect in detail, in addition to the overall summary.
`;

const customOpenAILLM = async (transcript: string, userMessage: string) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [
      {
        "role": "developer",
        "content": [
          {
            "type": "text",
            "text": PROMPT
          }
        ]
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": userMessage
          }
        ]
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": transcript
          }
        ]
      }
    ],
    response_format: {
      "type": "text"
    },
    reasoning_effort: "high",
    max_completion_tokens: 20000
  });
  
  return response.choices[0].message.content;
};

// Function to get channel name using oembed
async function getChannelName(videoUrl: string): Promise<string> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const response = await fetch(oembedUrl);
    const data = await response.json();
    return data.author_name
  } catch (error) {
    console.error("Error fetching video info:", error);
    return "Unknown"
  }
}

// Function to get the video transcript
async function getVideoTranscript(videoId: string): Promise<any> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    return transcript;
  } catch (error) {
    console.error("Error fetching video transcript:", error);
    
    return "Sorry, I couldn't find a transcript for this video and failed to download the audio for transcription.";
  }
}

// Create the video explanation plugin
export const videoExplainPlugin = {
  name: "VideoExplain",
  description: "Explains YouTube videos using AI",
  actions: [
    {
      name: "EXPLAIN_VIDEO",
      // Updated pattern to match videxplain
      pattern: /videxplain/i,
      description: "Explains the content of a YouTube video",
      examples: [
        [
          {
            role: "user1",
            content: {
              text: "videxplain https://www.youtube.com/watch?v=example"
            }
          },
          {
            role: "Eliza",
            content: {
              text: "Here's what I found in the video:\n\n [video explanation]"
            }
          }
        ]
      ],
      validate: async (runtime: IAgentRuntime, message: any, state: any) => {
        // Check if the message is from whitelisted channels
        let isWhitelistedRoom = WHITELISTED_CHANNELS.includes(message.roomId);
        if (!isWhitelistedRoom) {
          // Check if message has "videxplain" in it
          let hasVidexplain = message.content.text.toLowerCase().includes("videxplain");
          if (!hasVidexplain) return false;
        }

        // Extract URL from message, can be http or https
        const urlMatch = message.content.text.match(/http:\/\/[^\s]+|https:\/\/[^\s]+/);
        if (!urlMatch) {
          return false;
        }
        const url = urlMatch[0].trim();

        // Basic URL validation
        try {
          new URL(url);
          return true;
        } catch (e) {
          return false;
        }
      },
      handler: async (runtime: IAgentRuntime, message: any, state: any, options: any, callback: (response: any) => void) => {
        // Extract message ID from URL
        let messageUrl = message.content.url;
        let messageId = messageUrl.split("/").at(-1);
        let channelId = messageUrl.split("/").at(-2);
        let channelName;

        // Check if the message is from discord
        let isDiscordMessage = message.content.source == "discord";

        try {
          // Get video info including channel name
          const urlMatch = message.content.text.match(/http:\/\/[^\s]+|https:\/\/[^\s]+/);
          let videoUrl = urlMatch[0].trim();

          channelName = await getChannelName(videoUrl);
          let videoId;
          
          try {
            const url = new URL(videoUrl);
            if (url.hostname.includes('youtu.be')) {
              videoId = url.pathname.split('/')[1];
            } else if (url.hostname.includes('youtube.com')) {
              // Handle standard watch URLs
              videoId = url.searchParams.get('v');
              
              // Handle live URLs (youtube.com/live/VIDEO_ID)
              if (!videoId && url.pathname.includes('/live/')) {
                videoId = url.pathname.split('/live/')[1].split('/')[0];
              }
              
              // Handle shortened URLs without v parameter (youtube.com/shorts/VIDEO_ID)
              if (!videoId && url.pathname.includes('/shorts/')) {
                videoId = url.pathname.split('/shorts/')[1].split('/')[0];
              }
              
              // Handle embed URLs (youtube.com/embed/VIDEO_ID)
              if (!videoId && url.pathname.includes('/embed/')) {
                videoId = url.pathname.split('/embed/')[1].split('/')[0];
              }
            }
            
            if (!videoId) {
              throw new Error('Could not extract video ID');
            }
            
            // Construct a standard YouTube URL format for consistency
            videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          } catch (e) {
            let text = "Please provide a valid YouTube URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)";
            if (isDiscordMessage) {
              sendMessageToThread(messageId, channelId, channelName, text);
            } else {
              callback({ 
                text: text,
              });
            }
            return;
          }
          
          const transcript = await getVideoTranscript(videoId);
          if (!transcript || transcript.length === 0) {
            let text = "Sorry, I couldn't find a transcript for this video. The video might not have captions available.";
            if (isDiscordMessage) {
              sendMessageToThread(messageId, channelId, channelName, text);
            } else {
              callback({ 
                text: text,
              });
            }
            return;
          }

          let text = `Analyzing the video. Please give me a moment.`;
          if (isDiscordMessage) {
            sendMessageToThread(messageId, channelId, channelName, text);
          } else {
            callback({ text: text });
          }

          // Format the transcript into a readable text
          const formattedTranscript = transcript
            .map(entry => entry.text)
            .join(' ');
          const response = `Channel: ${channelName}\n\nHere is the transcript:${formattedTranscript}`;

          // Extract the prompt by removing the disexplain prefix and channel ID
          let prompt = message.content.text
            .toLowerCase()
            .replace(/^videxplain\s+/i, '') // Remove prefix
            .replace(/<#\d+>/, '') // Remove channel ID
            .replace(/\s+\d+[hdwm]\s*$/, '') // Remove time if present
            .replace(/https?:\/\/[^\s]+/g, '') // Remove URL
            .trim();

          // Generate AI summary using the user's message
          const summary = await customOpenAILLM(response, prompt);

          // Return the summary as a reply to the original message
          if (isDiscordMessage) {
            sendMessageToThread(messageId, channelId, channelName, summary);
          } else {
            callback({ text: summary });
          }

          // Save complete summary to file
          // fs.writeFileSync("video_explanation.md", summary);
          // console.log("VideoExplain: Summary saved to video_explanation.md");
          return summary;
        } catch (error) {
          let errorMessage = "Sorry, I encountered an error while processing the video.\n";
          if (error.includes("transcript.map")) {
            errorMessage += "The video might not have captions available.\n";
          } else 
            errorMessage += "\nerror: " + error;
          
          if (isDiscordMessage) {
            sendMessageToThread(messageId, channelId, channelName, errorMessage);
          } else {
            callback({ text: errorMessage });
          }
        }
      }
    }
  ],
  evaluators: []
};

export default videoExplainPlugin; 