#!/usr/bin/env node

/**
 * Test script for VideoExplain plugin
 * 
 * Tests both transcript fetching methods (primary and yt-dlp fallback)
 * and the full video explanation functionality
 */

import dotenv from 'dotenv';
import { YoutubeTranscript } from 'youtube-transcript';
import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from "openai";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Innertube } from 'youtubei.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);

// Sample videos for testing
const TEST_VIDEOS = [
    {
        url: 'https://www.youtube.com/live/CcrINg2jwHE', // Should work with primary method
        id: 'CcrINg2jwHE',
        name: 'Short video with transcript'
    },
    {
        url: 'https://www.youtube.com/live/Eb-VJgJpe_o', // Should work with primary method
        id: 'Eb-VJgJpe_o',
        name: 'Standard video with transcript'
    },
];

// Function to get channel name using oembed (copied from plugin)
async function getChannelName(videoUrl) {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
        const response = await fetch(oembedUrl);
        const data = await response.json();
        return data.author_name;
    } catch (error) {
        console.error("Error fetching video info:", error);
        return "Unknown";
    }
}

// Function to get transcripts using YoutubeTranscript
async function getPrimaryTranscript(videoId) {
    try {
        console.log(`\nTesting primary transcript method for video ID: ${videoId}`);
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        console.log(`✅ Primary transcript method successful! Got ${transcript.length} entries`);
        return transcript;
    } catch (error) {
        console.error("❌ Error fetching video transcript with primary method:", error.message);
        return null;
    }
}

// Function to get transcripts using yt-dlp as fallback (copied from plugin)
async function getTranscriptWithYtDlp(videoId) {
    try {
        // Create temp directory if it doesn't exist
        const tempDir = path.resolve('./temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const audioPath = path.join(tempDir, `${videoId}.mp3`);

        // Download audio using youtubei.js
        const youtube = await Innertube.create();

        console.log(`Downloading audio for video ${videoId}...`);

        // Download the audio stream 
        const stream = await youtube.download(videoId, {
            type: 'audio',
            quality: 'best'
        });

        // Get reader from stream
        const reader = stream.getReader();
        const chunks = [];

        // Read all chunks from the stream
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        // Combine all chunks into a single buffer
        const buffer = Buffer.concat(chunks);

        // Write buffer to file
        fs.writeFileSync(audioPath, buffer);

        console.log(`Audio downloaded to ${audioPath}`);

        // Transcribe using OpenAI Whisper API
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-1",
        });

        // Clean up the temporary file
        fs.unlinkSync(audioPath);

        // Format as transcript entries to match YoutubeTranscript format
        const formattedTranscript = [{
            text: transcription.text,
            offset: 0,
            duration: 0
        }];

        return formattedTranscript;
    } catch (error) {
        console.error("❌ Error fetching video transcript with yt-dlp:", error.message);
        return null;
    }
}

// Function to get the video transcript (combined approach)
async function getVideoTranscript(videoId) {
    console.log(`\nTesting complete transcript pipeline for video ID: ${videoId}`);

    const transcript = await getPrimaryTranscript(videoId);
    if (transcript) {
        return { method: 'primary', transcript };
    }

    console.log("Primary method failed, trying fallback...");
    const fallbackTranscript = await getTranscriptWithYtDlp(videoId);
    if (fallbackTranscript) {
        return { method: 'fallback', transcript: fallbackTranscript };
    }

    console.log("❌ Both transcript methods failed");
    return { method: 'failed', transcript: null };
}

// Test the LLM processing (simplified version)
async function testLLMProcessing(transcript, userMessage = "Explain this video") {
    if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ Skipping LLM test: OPENAI_API_KEY not found in environment");
        return null;
    }

    console.log("\nTesting LLM processing with transcript...");
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const PROMPT = `
    You're a Crypto expert. 
    
    Structurize the following and be as DETAILED, AND TECHNICAL as POSSIBLE. 
    Please get the name from the channel name and use it to explain. "name" says this, "name" explains, "name" thinks, in views of "name", etc.
    Don't include Introduction/Overview and Conclusions. I DON'T NEED THEM. DON'T INCLUDE THEM.
    
    And return in markdown format, don't include \`\`\` or "markdown" in the response.
    `;

        // Format transcript for LLM
        const transcriptText = transcript
            .map(entry => entry.text)
            .join(' ');

        // Call OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Using a different model than in prod for testing
            messages: [
                {
                    role: "system",
                    content: PROMPT
                },
                {
                    role: "user",
                    content: userMessage
                },
                {
                    role: "user",
                    content: transcriptText
                }
            ],
            max_tokens: 500 // Limiting for testing purposes
        });

        console.log("✅ LLM processing successful!");
        return response.choices[0].message.content;
    } catch (error) {
        console.error("❌ Error processing with LLM:", error.message);
        return null;
    }
}

// Main test function
async function runTests() {
    console.log("🧪 VideoExplain Plugin Test Script 🧪");
    console.log("====================================\n");

    for (const video of TEST_VIDEOS) {
        console.log(`\n📹 Testing video: ${video.name} (${video.id})`);

        // Test channel name extraction
        const channelName = await getChannelName(video.url);
        console.log(`Channel name: ${channelName}`);

        // Test transcript methods
        const result = await getVideoTranscript(video.id);

        if (result.transcript) {
            console.log(`✅ Got transcript using ${result.method} method`);

            // Test with a small sample of the transcript for speed
            const sampleTranscript = result.transcript.slice(0, 10);

            // Test LLM processing if we have a transcript
            const summary = await testLLMProcessing(sampleTranscript, `Summarize this video by ${channelName}`);
            if (summary) {
                console.log("\n📝 Sample Summary:");
                console.log("-------------------");
                console.log(summary.substring(0, 200) + "...");
            }
        } else {
            console.log("❌ Failed to get transcript with any method");
        }

        console.log("\n-----------------------------------");
    }
}

// Run the tests
runTests()
    .then(() => console.log("\n🎉 Test completed!"))
    .catch(error => console.error("\n❌ Test failed with error:", error)); 