/**
 * Search Service for NJDSC School Compliance Portal
 *
 * Provides search functionality across Google Custom Search and social media platforms
 * for data enrichment of compliance reports. Includes result aggregation, deduplication,
 * and confidence scoring.
 */

const { google } = require('googleapis');
const axios = require('axios');
const configService = require('./configService');
const socialMediaService = require('./socialMediaService');

// Environment variables and configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

// Validate required environment variables
if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

if (!GOOGLE_SEARCH_ENGINE_ID) {
  throw new Error('GOOGLE_SEARCH_ENGINE_ID environment variable is required');
}

// Initialize Google Custom Search API client
const customSearch = google.customsearch('v1');

// Rate limiting configuration
const RATE_LIMITS = {
  google: {
    requestsPerMinute: 100, // Google Custom Search free tier limit
    requestsPerDay: 10000
  },
  socialMedia: {
    requestsPerMinute: 60, // Conservative limit for social media APIs
    requestsPerDay: 1000
  }
};

// In-memory rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const DAY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Logs operation details for debugging and monitoring
 * @param {string} operation - Operation name
 * @param {Object} details - Additional details to log
 */
function logOperation(operation, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] SearchService.${operation}:`, details);
}

/**
 * Handles API errors with appropriate error messages
 * @param {Error} error - Error from API
 * @param {string} operation - Operation that failed
 * @throws {Error} Processed error with context
 */
function handleApiError(error, operation) {
  logOperation(operation, { error: error.message, code: error.code });

  if (error.code === 403) {
    throw new Error('Access denied to search API. Check API key and permissions.');
  } else if (error.code === 404) {
    throw new Error('Search API endpoint not found. Verify API configuration.');
  } else if (error.code === 429) {
    throw new Error('Search API rate limit exceeded. Please try again later.');
  } else if (error.code === 400) {
    throw new Error('Invalid request to search API. Check query parameters.');
  } else {
    throw new Error(`Search API error during ${operation}: ${error.message}`);
  }
}

/**
 * Checks if rate limit is exceeded for a given API
 * @param {string} apiName - Name of the API (google, socialMedia)
 * @returns {boolean} True if rate limit exceeded
 */
function isRateLimitExceeded(apiName) {
  const now = Date.now();
  const key = `${apiName}_minute`;
  const dayKey = `${apiName}_day`;

  const minuteRequests = rateLimitStore.get(key) || [];
  const dayRequests = rateLimitStore.get(dayKey) || [];

  // Clean old requests
  const recentMinuteRequests = minuteRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  const recentDayRequests = dayRequests.filter(time => now - time < DAY_WINDOW);

  // Check limits
  const limits = RATE_LIMITS[apiName];
  if (recentMinuteRequests.length >= limits.requestsPerMinute ||
      recentDayRequests.length >= limits.requestsPerDay) {
    return true;
  }

  return false;
}

/**
 * Records a request for rate limiting
 * @param {string} apiName - Name of the API
 */
function recordRequest(apiName) {
  const now = Date.now();
  const key = `${apiName}_minute`;
  const dayKey = `${apiName}_day`;

  // Record minute request
  const minuteRequests = rateLimitStore.get(key) || [];
  minuteRequests.push(now);
  rateLimitStore.set(key, minuteRequests.filter(time => now - time < RATE_LIMIT_WINDOW));

  // Record day request
  const dayRequests = rateLimitStore.get(dayKey) || [];
  dayRequests.push(now);
  rateLimitStore.set(dayKey, dayRequests.filter(time => now - time < DAY_WINDOW));
}

/**
 * Performs Google Custom Search
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {number} [options.num=10] - Number of results to return
 * @param {string} [options.siteSearch] - Restrict search to specific site
 * @param {string} [options.dateRestrict] - Date restriction (e.g., 'd1' for past day)
 * @returns {Array} Array of search results
 * @throws {Error} If search fails or rate limit exceeded
 */
async function googleSearch(query, options = {}) {
  try {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Invalid query: must be a non-empty string');
    }

    if (isRateLimitExceeded('google')) {
      throw new Error('Google search rate limit exceeded. Please try again later.');
    }

    logOperation('googleSearch', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      options
    });

    const searchOptions = {
      auth: GOOGLE_API_KEY,
      cx: GOOGLE_SEARCH_ENGINE_ID,
      q: query,
      num: options.num || 10,
      ...options
    };

    const response = await customSearch.cse.list(searchOptions);
    recordRequest('google');

    const results = response.data.items || [];

    logOperation('googleSearch', {
      query,
      resultCount: results.length,
      totalResults: response.data.searchInformation?.totalResults
    });

    return results.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      source: 'google',
      confidence: calculateConfidence(item),
      metadata: {
        kind: item.kind,
        pagemap: item.pagemap
      }
    }));

  } catch (error) {
    handleApiError(error, 'googleSearch');
  }
}

/**
 * Performs search across social media platforms
 * @param {string} query - Search query
 * @param {Array<string>} platforms - Array of platforms to search (facebook, instagram, linkedin)
 * @returns {Array} Array of aggregated search results
 * @throws {Error} If search fails
 */
async function socialMediaSearch(query, platforms = ['facebook', 'instagram', 'linkedin']) {
  try {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Invalid query: must be a non-empty string');
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new Error('Invalid platforms: must be a non-empty array');
    }

    logOperation('socialMediaSearch', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      platforms
    });

    const searchPromises = platforms.map(async (platform) => {
      try {
        switch (platform.toLowerCase()) {
          case 'facebook':
            return await socialMediaService.searchFacebook(query);
          case 'instagram':
            return await socialMediaService.searchInstagram(query);
          case 'linkedin':
            return await socialMediaService.searchLinkedIn(query);
          default:
            logOperation('socialMediaSearch', { warning: `Unknown platform: ${platform}` });
            return [];
        }
      } catch (error) {
        logOperation('socialMediaSearch', {
          platform,
          error: error.message,
          continuing: true
        });
        return []; // Continue with other platforms if one fails
      }
    });

    const results = await Promise.all(searchPromises);
    const flattenedResults = results.flat();

    logOperation('socialMediaSearch', {
      query,
      platforms,
      totalResults: flattenedResults.length
    });

    return flattenedResults;

  } catch (error) {
    handleApiError(error, 'socialMediaSearch');
  }
}

/**
 * Enriches report data with additional information from search APIs
 * @param {Object} reportData - Original report data
 * @param {Object} options - Enrichment options
 * @param {boolean} [options.includeGoogle=true] - Include Google search results
 * @param {boolean} [options.includeSocialMedia=true] - Include social media results
 * @param {Array<string>} [options.socialPlatforms] - Specific social platforms to search
 * @returns {Object} Enriched report data with additional information
 * @throws {Error} If enrichment fails
 */
async function enrichReportData(reportData, options = {}) {
  try {
    if (!reportData || typeof reportData !== 'object') {
      throw new Error('Invalid report data: must be an object');
    }

    const {
      includeGoogle = true,
      includeSocialMedia = true,
      socialPlatforms = ['facebook', 'instagram', 'linkedin']
    } = options;

    logOperation('enrichReportData', {
      reportId: reportData.id || 'unknown',
      includeGoogle,
      includeSocialMedia,
      socialPlatforms
    });

    // Build search query from report data
    const searchQuery = buildSearchQuery(reportData);

    // Perform searches in parallel
    const searchPromises = [];

    if (includeGoogle) {
      searchPromises.push(googleSearch(searchQuery, { num: 5 }));
    }

    if (includeSocialMedia) {
      searchPromises.push(socialMediaSearch(searchQuery, socialPlatforms));
    }

    const searchResults = await Promise.all(searchPromises);
    const allResults = searchResults.flat();

    // Process and aggregate results
    const processedResults = processSearchResults(allResults);

    // Calculate enrichment metrics
    const enrichmentMetrics = {
      totalResults: allResults.length,
      uniqueSources: new Set(processedResults.map(r => r.source)).size,
      highConfidenceResults: processedResults.filter(r => r.confidence > 0.7).length,
      categories: categorizeResults(processedResults)
    };

    const enrichedData = {
      ...reportData,
      enrichment: {
        searchQuery,
        results: processedResults,
        metrics: enrichmentMetrics,
        timestamp: new Date().toISOString(),
        sources: {
          google: includeGoogle,
          socialMedia: includeSocialMedia ? socialPlatforms : []
        }
      }
    };

    logOperation('enrichReportData', {
      reportId: reportData.id || 'unknown',
      resultsCount: processedResults.length,
      metrics: enrichmentMetrics
    });

    return enrichedData;

  } catch (error) {
    handleApiError(error, 'enrichReportData');
  }
}

/**
 * Builds a search query from report data
 * @param {Object} reportData - Report data
 * @returns {string} Formatted search query
 */
function buildSearchQuery(reportData) {
  const parts = [];

  if (reportData.schoolName) {
    parts.push(`"${reportData.schoolName}"`);
  }

  if (reportData.location) {
    parts.push(`"${reportData.location}"`);
  }

  if (reportData.violationDescription) {
    // Extract key terms from violation description
    const keywords = extractKeywords(reportData.violationDescription);
    parts.push(...keywords.slice(0, 3)); // Limit to 3 keywords
  }

  // Add context terms
  parts.push('driving school', 'DMV', 'license');

  return parts.join(' ').substring(0, 200); // Limit query length
}

/**
 * Extracts keywords from text
 * @param {string} text - Text to extract keywords from
 * @returns {Array<string>} Array of keywords
 */
function extractKeywords(text) {
  if (!text) return [];

  // Simple keyword extraction - split by spaces and filter common words
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];

  return words
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
}

/**
 * Processes and aggregates search results
 * @param {Array} results - Raw search results
 * @returns {Array} Processed and deduplicated results
 */
function processSearchResults(results) {
  if (!Array.isArray(results)) return [];

  // Remove duplicates based on link
  const uniqueResults = results.filter((result, index, self) =>
    index === self.findIndex(r => r.link === result.link)
  );

  // Sort by confidence score
  uniqueResults.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  // Limit results
  return uniqueResults.slice(0, 20);
}

/**
 * Calculates confidence score for a search result
 * @param {Object} result - Search result
 * @returns {number} Confidence score between 0 and 1
 */
function calculateConfidence(result) {
  let score = 0.5; // Base score

  // Boost score based on various factors
  if (result.title && result.title.toLowerCase().includes('driving school')) {
    score += 0.2;
  }

  if (result.snippet && result.snippet.toLowerCase().includes('license')) {
    score += 0.1;
  }

  if (result.displayLink && result.displayLink.includes('.gov')) {
    score += 0.3; // Government sites are more reliable
  }

  if (result.source === 'google') {
    score += 0.1; // Google results generally more reliable
  }

  return Math.min(score, 1.0);
}

/**
 * Categorizes search results by type
 * @param {Array} results - Search results
 * @returns {Object} Categorized results
 */
function categorizeResults(results) {
  const categories = {
    government: [],
    business: [],
    social: [],
    news: [],
    other: []
  };

  results.forEach(result => {
    const link = result.link || '';
    const displayLink = result.displayLink || '';

    if (link.includes('.gov') || displayLink.includes('.gov')) {
      categories.government.push(result);
    } else if (link.includes('facebook.com') || link.includes('instagram.com') || link.includes('linkedin.com')) {
      categories.social.push(result);
    } else if (link.includes('news') || displayLink.includes('news')) {
      categories.news.push(result);
    } else if (link.includes('business') || displayLink.includes('business')) {
      categories.business.push(result);
    } else {
      categories.other.push(result);
    }
  });

  return categories;
}

module.exports = {
  googleSearch,
  socialMediaSearch,
  enrichReportData,

  // Utility functions for testing
  buildSearchQuery,
  processSearchResults,
  calculateConfidence,
  categorizeResults,
  isRateLimitExceeded,
  recordRequest
};