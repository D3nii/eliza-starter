import { IAgentRuntime, elizaLogger, generateText, composeContext, ModelClass } from "@elizaos/core";
import { YoutubeTranscript } from 'youtube-transcript';

// Prompt for the video explain plugin
const PROMPT = `
You are a seasoned cryptocurrency expert and market analyst with deep knowledge of blockchain, tokens, and market trends. Your task is to analyze the transcript of a video where various traders discuss specific cryptocurrencies or tokens. The transcript might cover multiple projects and include detailed opinions, price targets, concerns, and other market insights.

Your analysis should follow this structured format for each token mentioned:

1. **Token Name**  
   - Identify the token or project being discussed (e.g., Bitcoin, Ethereum, etc.).

2. **General Thoughts and Sentiments**  
   - Summarize the overall sentiment expressed by the traders (e.g., bullish, bearish, neutral).
   - Include qualitative insights about the token’s technology, market positioning, and future potential.
   - Note any contrasting opinions if traders provide divergent views.

3. **Price Targets and Predictions**  
   - Extract all price targets mentioned by traders. For each price target, provide:
     - The specific price value (or range) mentioned.
     - The context or timeframe if given (e.g., short-term, long-term).
     - Any reasoning or supporting evidence provided (e.g., technical analysis, historical performance).
   - If multiple price targets are mentioned, list them in order, noting which trader said what if identifiable.
   - Break down any related technical analysis (e.g., resistance levels, support levels, moving averages) that might be mentioned.

4. **Areas of Concern and Risks**  
   - Identify any risks, concerns, or warnings discussed regarding the token.
   - Summarize specific issues such as market volatility, regulatory concerns, project-specific risks, or external factors.
   - Include potential scenarios discussed by traders (e.g., what might cause a price drop or increased uncertainty).

5. **Additional Context and Observations**  
   - Note any extra details that could be relevant, such as news events, changes in market sentiment, technological updates, or macroeconomic factors.
   - If the transcript includes comparisons to other tokens or broader market trends, summarize those points.

6. **Edge Cases and Ambiguities**  
   - If a token is mentioned in passing or if multiple tokens are discussed in one segment, ensure that the analysis clearly separates them.
   - For ambiguous or incomplete statements, indicate the uncertainty and list any assumptions you are making.
   - If price targets or technical details are not explicitly clear, use contextual clues to provide the best possible interpretation, and note where details are missing.

7. **Output Format**  
   - Your final response should be clearly formatted using headings and bullet points for each section.
   - Ensure that each token is processed in its own dedicated section.
   - If the transcript does not mention any specific token or if some sections are missing, explicitly state “Not mentioned” or “Data insufficient” for those parts.

**Instructions for Processing the Transcript:**

- Begin by reading the entire transcript to identify all the tokens or projects mentioned.
- For each identified token, go through the transcript and extract information relevant to the above sections.
- Handle multiple speakers by attributing different opinions when possible, and note if a single speaker’s analysis differs across segments.
- In cases of conflicting data, list all viewpoints and note that opinions vary.
- Finally, present your analysis in a clear, structured format so that someone with minimal crypto background can understand the key insights quickly.

**Example Output Structure:**

Token: Bitcoin
General Thoughts:
Predominantly bullish sentiment with discussions on its long-term potential.
Some traders noted its dominance as a store of value.

Price Targets:
Price Target 1: $70,000 (short-term rally expectation based on technical analysis).
Price Target 2: $90,000 (long-term view factoring in halving effects and institutional interest).

Comments: One trader mentioned resistance levels at $65,000, while another focused on support levels near $55,000.

Areas of Concern:
Regulatory uncertainties in major markets.
Concerns over potential market corrections after reaching historical highs.

Additional Context:
Mention of macroeconomic trends such as inflation and global economic slowdown.
Comparison to previous bull cycles and discussions on miner behavior.

Edge Cases/Assumptions:
Some segments mentioned “crypto” generally without specifying Bitcoin; these were omitted unless context confirmed it was about Bitcoin.

Here is the transcript:
{{transcript}}
`;

// Create the video explanation plugin
export const videoExplainPlugin = {
  name: "VideoExplain",
  description: "Explains YouTube videos using AI",
  actions: [
    {
      name: "EXPLAIN_VIDEO",
      // Make pattern more flexible to catch common typos
      pattern: /(?:explain\s+(?:this\s+)?(?:v[ie]d(?:eo)?))\s+(?:to\s+me\s+)?(.+)/i,
      description: "Explains the content of a YouTube video",
      examples: [
        [
          {
            role: "user1",
            content: {
              text: "explain this video to me https://www.youtube.com/watch?v=example"
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
        elizaLogger.log("VideoExplain: Validating request...");
        
        // Check if message contains a URL-like string
        const match = message.content.text.match(/(?:explain\s+(?:this\s+)?(?:v[ie]d(?:eo)?))\s+(?:to\s+me\s+)?(.+)/i);
        if (!match) {
          elizaLogger.warn("VideoExplain: Validation failed - No URL found in message");
          return false;
        }

        const url = match[1].trim();
        
        // Basic URL validation
        try {
          new URL(url);
          elizaLogger.log("VideoExplain: URL validation passed");
          return true;
        } catch (e) {
          elizaLogger.warn("VideoExplain: Validation failed - Invalid URL format");
          return false;
        }
      },
      handler: async (runtime: IAgentRuntime, message: any, state: any, options: any, callback: (response: any) => void) => {
        try {
          elizaLogger.log("VideoExplain: Processing new request...");
          
          const match = message.content.text.match(/(?:explain\s+(?:this\s+)?(?:v[ie]d(?:eo)?))\s+(?:to\s+me\s+)?(.+)/i);
          if (!match) {
            elizaLogger.warn("VideoExplain: No URL provided in the request");
            callback({ text: "Please provide a valid YouTube URL" });
            return;
          }

          let videoUrl = match[1].trim();
          let videoId;
          
          try {
            const url = new URL(videoUrl);
            if (url.hostname.includes('youtu.be')) {
              videoId = url.pathname.split('/')[1];
            } else if (url.hostname.includes('youtube.com')) {
              videoId = url.searchParams.get('v');
            }
            
            if (!videoId) {
              throw new Error('Could not extract video ID');
            }
            
            elizaLogger.log(`VideoExplain: Processing video ID: ${videoId}`);
          } catch (e) {
            callback({ text: "Please provide a valid YouTube URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)" });
            return;
          }

          const transcript = await YoutubeTranscript.fetchTranscript(videoId);
          if (!transcript || transcript.length === 0) {
            callback({ text: "Sorry, I couldn't find a transcript for this video. The video might not have captions available." });
            return;
          }

          // Format the transcript into a readable text
          const formattedTranscript = transcript
            .map(entry => entry.text)
            .join(' ');

          // Generate AI summary
          elizaLogger.log("VideoExplain: Generating AI summary...");
          const summary = await generateText({
            runtime,
            context: PROMPT.replace('{{transcript}}', formattedTranscript),
            modelClass: ModelClass.LARGE
          });

          callback({ text: summary });
          elizaLogger.success("VideoExplain: Request completed successfully");
        } catch (error) {
          elizaLogger.error("VideoExplain: Error processing video:", error);
          
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
elizaLogger.log("VideoExplain plugin loaded successfully");

export default videoExplainPlugin; 