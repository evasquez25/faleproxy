const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Homepage route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Replace all occurrences of "Yale" with "Fale" in the given text
 * @param {string} text - The text to process
 * @returns {string} - The processed text with Yale replaced with Fale
 */
function replaceYaleWithFale(text) {
  // Handle null, undefined, or non-string inputs
  if (text === null || text === undefined) {
    return '';
  }
  
  // Convert non-string inputs to string
  if (typeof text !== 'string') {
    return String(text);
  }
  
  // If the text is empty, return it as is
  if (!text) {
    return text;
  }

  // Special case for URLs and class names in HTML content
  if (text.includes('<') && text.includes('>')) {
    // Use cheerio to parse HTML content
    try {
      const $ = cheerio.load(text);
      
      // Process text nodes only
      $('*').contents().each(function() {
        if (this.type === 'text') {
          const nodeText = $(this).text();
          const newText = nodeText
            .replace(/YALE/g, 'FALE')
            .replace(/Yale/g, 'Fale')
            .replace(/yale/g, 'fale');
          
          if (nodeText !== newText) {
            $(this).replaceWith(newText);
          }
        }
      });
      
      return $.html();
    } catch (error) {
      // If HTML parsing fails, fall back to simple text replacement
    }
  }

  // For plain text, do a simple replacement
  return text
    .replace(/YALE/g, 'FALE')
    .replace(/Yale/g, 'Fale')
    .replace(/yale/g, 'fale');
}

/**
 * Process HTML content to replace Yale with Fale
 * @param {string} html - The HTML content to process
 * @param {string} baseUrl - The base URL for resolving relative URLs
 * @returns {string} - The processed HTML with Yale replaced with Fale
 */
function processHtml(html, baseUrl) {
  try {
    const $ = cheerio.load(html);
    
    // Add base tag to handle relative URLs
    if (baseUrl) {
      $('head').prepend(`<base href="${baseUrl}">`);
    }
    
    // Replace text in title
    if ($('title').length) {
      const title = $('title').text();
      $('title').text(replaceYaleWithFale(title));
    }
    
    // Process all text nodes
    $('*').contents().each(function() {
      if (this.type === 'text') {
        const text = $(this).text();
        const newText = replaceYaleWithFale(text);
        
        if (text !== newText) {
          $(this).replaceWith(newText);
        }
      }
    });
    
    // Process all attributes that might contain text
    $('*').each(function() {
      const attrs = ['alt', 'title', 'placeholder', 'aria-label'];
      
      attrs.forEach(attr => {
        if ($(this).attr(attr)) {
          const attrValue = $(this).attr(attr);
          $(this).attr(attr, replaceYaleWithFale(attrValue));
        }
      });
    });
    
    return $.html();
  } catch (error) {
    // If HTML processing fails, fall back to simple text replacement
    return replaceYaleWithFale(html);
  }
}

/**
 * Process any content to replace Yale with Fale
 * @param {string} content - The content to process
 * @param {string} contentType - The content type
 * @param {string} baseUrl - The base URL for resolving relative URLs
 * @returns {string} - The processed content with Yale replaced with Fale
 */
function processContent(content, contentType, baseUrl) {
  if (!content) return '';
  
  // Handle HTML content
  if (contentType && contentType.includes('text/html')) {
    return processHtml(content, baseUrl);
  }
  
  // Handle JSON content
  if (contentType && contentType.includes('application/json')) {
    try {
      // If content is already an object, stringify it first
      const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
      const jsonObj = JSON.parse(contentStr);
      
      // Process all string values in the JSON
      function processJsonValues(obj) {
        if (!obj) return obj;
        
        if (typeof obj === 'string') {
          return replaceYaleWithFale(obj);
        }
        
        if (Array.isArray(obj)) {
          return obj.map(item => processJsonValues(item));
        }
        
        if (typeof obj === 'object') {
          const result = {};
          for (const key in obj) {
            result[key] = processJsonValues(obj[key]);
          }
          return result;
        }
        
        return obj;
      }
      
      const processedObj = processJsonValues(jsonObj);
      return JSON.stringify(processedObj);
    } catch (error) {
      // If JSON processing fails, fall back to simple text replacement
      return replaceYaleWithFale(String(content));
    }
  }
  
  // For all other content types, just do a simple text replacement
  return replaceYaleWithFale(String(content));
}

// Fetch and modify content endpoint
app.post('/fetch', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'FaleProxy/1.0'
      }
    });
    
    const contentType = response.headers['content-type'];
    const baseUrl = new URL(url).origin;
    
    // Process the content based on its type
    const processedContent = processContent(response.data, contentType, baseUrl);
    
    // Extract title from HTML content if possible
    let title = '';
    if (contentType && contentType.includes('text/html')) {
      try {
        const $ = cheerio.load(processedContent);
        title = $('title').text() || '';
      } catch (error) {
        title = '';
      }
    }
    
    return res.status(200).json({
      success: true,
      originalUrl: url,
      title,
      content: processedContent
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
    });
  }
});

// Start the server if not being imported for testing
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Faleproxy server running on port ${PORT}`);
  });
}

// Export the Express app as the default export for Vercel
// Also attach the utility functions to the app object for testing
app.replaceYaleWithFale = replaceYaleWithFale;
app.processHtml = processHtml;
app.processContent = processContent;

module.exports = app;
