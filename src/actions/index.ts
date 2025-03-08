import { Action } from '@elizaos/core';
import { 
  customSummarizeAction, 
  configureSummarizer, 
  SummarizerConfig,
  directSummarizeHandler
} from './customSummarize.ts';

// Create a collection of our custom actions
export const customActions: Action[] = [
  customSummarizeAction
];

// Export the summarization action individually for direct access
export const summarizeAction = customSummarizeAction;

// Export the direct handler for immediate use
export const triggerSummarize = directSummarizeHandler;

// Re-export the configuration function and types
export { configureSummarizer, SummarizerConfig, directSummarizeHandler };

// Log our actions for debugging
console.log("Actions index: Exporting custom actions:", customActions.map(a => a.name));

export default customActions; 