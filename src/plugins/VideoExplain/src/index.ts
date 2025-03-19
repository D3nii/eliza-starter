import { IAgentRuntime, generateText, composeContext, ModelClass } from "@elizaos/core";
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from "openai";
import { sendWebhookMessage } from "../../shared/discordWebhook.js";

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
    reasoning_effort: "high"
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
        // Extract URL from message
        const urlMatch = message.content.text.match(/https?:\/\/[^\s]+/);
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
        try {
          console.log("VideoExplain: Processing new request...");
          
          const urlMatch = message.content.text.match(/https?:\/\/[^\s]+/);
          if (!urlMatch) {
            console.warn("VideoExplain: No URL provided in the request");
            callback({ text: "Please provide a valid YouTube URL" });
            return;
          }

          let videoUrl = urlMatch[0].trim();
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
            
            console.log(`VideoExplain: Processing video ID: ${videoId}`);
          } catch (e) {
            console.error("VideoExplain: Error processing video:", e);
            callback({ text: "Please provide a valid YouTube URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)" });
            return;
          }

          // Get video info including channel name
          const channelName = await getChannelName(videoUrl);
          
          const transcript = await getVideoTranscript(videoId);
          if (!transcript || transcript.length === 0) {
            callback({ text: "Sorry, I couldn't find a transcript for this video. The video might not have captions available." });
            return;
          }

          // Format the transcript into a readable text
          const formattedTranscript = transcript
            .map(entry => entry.text)
            .join(' ');

          const response = `Channel: ${channelName}\n\nHere is the transcript:${formattedTranscript}`;

          // fs.writeFileSync("video_transcript.md", response);

          // Extract the prompt by removing the disexplain prefix and channel ID
          let prompt = message.content.text
            .toLowerCase()
            .replace(/^videxplain\s+/i, '') // Remove prefix
            .replace(/<#\d+>/, '') // Remove channel ID
            .replace(/\s+\d+[hdwm]\s*$/, '') // Remove time if present
            .replace(/https?:\/\/[^\s]+/g, '') // Remove URL
            .trim();

          // Generate AI summary using the user's message
          console.log("VideoExplain: Generating AI summary...");
          const summary = await customOpenAILLM(response, prompt);

          console.log("VideoExplain: Sending webhook message...");
          sendWebhookMessage("videos", "ElizaOS", summary);

          // Save complete summary to file
          // fs.writeFileSync("video_explanation.md", summary);
          // console.log("VideoExplain: Summary saved to video_explanation.md");

          console.log("VideoExplain: Request completed successfully");
          return summary;
        } catch (error) {
          console.error("VideoExplain: Error processing video:", error);
          
          let errorMessage = "Sorry, I encountered an error while processing the video.\n";
          errorMessage += "Please check if:\n";
          errorMessage += "1. The video URL is correct and accessible\n";
          errorMessage += "2. The video has captions/subtitles available\n";
          errorMessage += "3. The video is not private or age-restricted";
          
          callback({ text: errorMessage });
        }
      }
    }
  ],
  evaluators: []
};

// Log when the plugin is loaded
console.log("VideoExplain plugin loaded successfully");

export default videoExplainPlugin; 