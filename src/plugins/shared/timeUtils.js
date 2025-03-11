/**
 * Shared time utilities for ElizaOS plugins
 * These utilities can be imported and used by any plugin
 */

/**
 * Utility function to convert a time period string to hours
 * @param {string} timePeriod - Time period string (e.g., "1h", "2d", "1w", "1month")
 * @returns {number} - Equivalent hours
 */
export function timeToHours(timePeriod) {
    // Handle empty input
    if (!timePeriod) return 24; // Default to 1 day

    const input = timePeriod.toString().toLowerCase().trim().replace(/\s+/g, '');

    // Handle standard predefined formats
    const standardFormats = {
        '1h': 1,
        '2h': 2,
        '3h': 3,
        '4h': 4,
        '6h': 6,
        '8h': 8,
        '12h': 12,
        '1d': 24,
        '2d': 48,
        '3d': 72,
        '1w': 168,     // 7 days * 24 hours
        '2w': 336,     // 14 days * 24 hours
        '1month': 720  // ~30 days * 24 hours
    };

    // Check for predefined time periods
    if (standardFormats[input]) {
        return standardFormats[input];
    }

    // Check for numeric with unit format (e.g., "3h", "2d")
    const numericMatch = input.match(/^(\d+)([hdwm])$/);
    if (numericMatch) {
        const value = parseInt(numericMatch[1]);
        const unit = numericMatch[2];

        // Convert to hours based on unit
        switch (unit) {
            case 'h': return value;
            case 'd': return value * 24;
            case 'w': return value * 24 * 7;
            case 'm': return value * 24 * 30; // Approximate
            default: return 24; // Default to 1 day
        }
    }

    // Check for explicit time period words
    if (input.includes('hour')) {
        const num = parseInt(input) || 1;
        return num;
    } else if (input.includes('day')) {
        const num = parseInt(input) || 1;
        return num * 24;
    } else if (input.includes('week')) {
        const num = parseInt(input) || 1;
        return num * 24 * 7;
    } else if (input.includes('month')) {
        const num = parseInt(input) || 1;
        return num * 24 * 30;
    }

    // If we can't parse it, default to 24 hours (1 day)
    return 24;
}

/**
 * Get a formatted display string for a time period (for UI purposes)
 * @param {string} timePeriod - Raw time period string
 * @returns {string} - Formatted display string (e.g., "1h", "2d", "1w")
 */
export function formatTimePeriod(timePeriod) {
    // Handle empty input
    if (!timePeriod) return '1d'; // Default to 1 day

    const input = timePeriod.toString().toLowerCase().trim().replace(/\s+/g, '');

    // Check if it's already in the standard format
    if (/^\d+[hdwm]$/.test(input)) {
        return input;
    }

    // Extract numeric part and unit
    if (input.includes('hour')) {
        const num = parseInt(input) || 1;
        return `${num}h`;
    } else if (input.includes('day')) {
        const num = parseInt(input) || 1;
        return `${num}d`;
    } else if (input.includes('week')) {
        const num = parseInt(input) || 1;
        return `${num}w`;
    } else if (input.includes('month')) {
        const num = parseInt(input) || 1;
        return `${num}month`;
    }

    // If we can't format it, return the default
    return '1d';
}

/**
 * Parse a command for a time period and return both hours and display format
 * @param {string} text - Command text to parse
 * @param {RegExp} pattern - Regex pattern to extract the time period
 * @returns {object} - Object with hours and display properties
 */
export function parseTimeCommand(text, pattern) {
    const lowerText = text.toLowerCase().trim();

    // Extract time period using the provided pattern
    const timeMatch = lowerText.match(pattern);

    if (timeMatch && timeMatch[1]) {
        const timePart = timeMatch[1].toLowerCase().replace(/\s+/g, '');
        const hours = timeToHours(timePart);
        const display = formatTimePeriod(timePart);

        return { hours, display };
    }

    // For any text that doesn't match the pattern,
    // try to extract standard time period keywords
    const standardTimePeriods = ['1h', '2h', '3h', '4h', '6h', '8h', '12h', '1d', '2d', '3d', '1w', '2w', '1month'];

    for (const period of standardTimePeriods) {
        if (lowerText.includes(period)) {
            const hours = timeToHours(period);
            return { hours, display: period };
        }
    }

    // Default to 24 hours (1 day) if no specific period is mentioned
    return { hours: 24, display: '1d' };
} 