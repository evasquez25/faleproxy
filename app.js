const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const url = require('url');

const app = express();
const PORT = 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to fetch and modify content
app.post('/fetch', async (req, res) => {
  try {
    const { url: targetUrl } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    const response = await axios.get(targetUrl);
    const html = response.data;

    // Use cheerio to parse HTML
    const $ = cheerio.load(html);
    
    // Function to convert relative URLs to absolute
    function makeUrlAbsolute(relativeUrl, base) {
      try {
        return new URL(relativeUrl, base).href;
      } catch {
        return relativeUrl;
      }
    }

    // Function to rewrite URLs to go through the proxy
    function rewriteUrl(originalUrl) {
      if (!originalUrl) return '';
      const absoluteUrl = makeUrlAbsolute(originalUrl, targetUrl);
      // Encode the URL to be used as a parameter
      return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    }

    // Rewrite all links
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        $(el).attr('href', rewriteUrl(href));
      }
    });

    // Rewrite image sources
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        $(el).attr('src', makeUrlAbsolute(src, targetUrl));
      }
    });

    // Process text nodes to replace Yale with Fale
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      const text = $(this).text();
      const newText = text.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });
    
    // Process title separately
    const title = $('title').text().replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
    $('title').text(title);
    
    // Update base tag or add one if it doesn't exist
    $('base').remove(); // Remove any existing base tags
    $('head').prepend(`<base href="${targetUrl}">`);
    
    return res.json({ 
      success: true, 
      content: $.html(),
      title: title,
      originalUrl: targetUrl
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
    });
  }
});

// Proxy route to handle clicked links
app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).send('URL parameter is required');
    }

    // Redirect to the main page with the URL in the input
    res.redirect(`/?url=${encodeURIComponent(targetUrl)}`);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send(`Proxy error: ${error.message}`);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Faleproxy server running at http://localhost:${PORT}`);
});
