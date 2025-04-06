const cheerio = require('cheerio');
const { sampleHtmlWithYale } = require('./test-utils');
const { replaceYaleWithFale, processHtml, processContent } = require('../app');

describe('Yale to Fale replacement logic', () => {
  
  test('Should replace Yale with Fale in plain text', () => {
    const html = sampleHtmlWithYale;
    const $ = cheerio.load(html);
    
    // Extract text from the HTML
    const text = $('body').text();
    
    // Replace Yale with Fale
    const modifiedText = replaceYaleWithFale(text);
    
    // Check that Yale has been replaced with Fale
    expect(modifiedText).toContain('Fale University');
    expect(modifiedText).not.toContain('Yale University');
  });
  
  test('Should replace Yale with Fale in HTML', () => {
    const html = sampleHtmlWithYale;
    const $ = cheerio.load(html);
    
    // Process the HTML
    const modifiedHtml = replaceYaleWithFale(html);
    
    // Parse the modified HTML
    const $modified = cheerio.load(modifiedHtml);
    
    // Check that Yale has been replaced with Fale in the title
    expect($modified('title').text()).toBe('Fale University Test Page');
    
    // Check that Yale has been replaced with Fale in the body
    expect($modified('h1').text()).toBe('Welcome to Fale University');
    
    // Check that Yale has been replaced with Fale in navigation links
    expect($modified('nav a').first().text()).toBe('About Fale');
  });
  
  test('Should replace Yale with Fale in HTML attributes that contain text', () => {
    const html = '<img alt="Yale University Logo" title="Yale University">';
    const modifiedHtml = processHtml(html);
    
    // Check that Yale has been replaced with Fale in alt and title attributes
    expect(modifiedHtml).toContain('alt="Fale University Logo"');
    expect(modifiedHtml).toContain('title="Fale University"');
  });
  
  test('Should add base tag when baseUrl is provided', () => {
    const html = '<html><head><title>Yale</title></head><body></body></html>';
    const modifiedHtml = processHtml(html, 'https://example.com');
    
    // Check that base tag has been added
    expect(modifiedHtml).toContain('<base href="https://example.com">');
    expect(modifiedHtml).toContain('<title>Fale</title>');
  });
  
  test('Should handle HTML parsing errors gracefully', () => {
    const invalidHtml = '<div>Yale University<div>';
    const modifiedHtml = processHtml(invalidHtml);
    
    // Even with invalid HTML, Yale should be replaced with Fale
    expect(modifiedHtml).toContain('Fale University');
    expect(modifiedHtml).not.toContain('Yale University');
  });
  
  test('Should handle different case variations of Yale', () => {
    const input = 'YALE University, Yale College, and yale medical school';
    const modifiedHtml = replaceYaleWithFale(input);
    
    expect(modifiedHtml).toContain('FALE University, Fale College, and fale medical school');
  });

  test('Should replace Yale with Fale in simple text', () => {
    const input = 'Welcome to Yale University';
    const expected = 'Welcome to Fale University';
    expect(replaceYaleWithFale(input)).toBe(expected);
  });

  test('Should replace Yale with Fale in mixed case text', () => {
    const input = 'YALE University and yale university';
    const expected = 'FALE University and fale university';
    expect(replaceYaleWithFale(input)).toBe(expected);
  });

  test('Should replace Yale with Fale in HTML content', () => {
    const input = '<div>Yale University</div><p>Welcome to Yale</p>';
    const result = replaceYaleWithFale(input);
    
    // Check that the content contains the replaced text
    expect(result).toContain('<div>Fale University</div>');
    expect(result).toContain('<p>Welcome to Fale</p>');
    expect(result).not.toContain('Yale');
  });

  test('Should replace Yale with Fale in HTML content with attributes', () => {
    const input = '<a href="https://yale.edu" class="yale-link">Yale University</a>';
    const result = replaceYaleWithFale(input);
    expect(result).toContain('Fale University');
    expect(result).toContain('href="https://yale.edu"');
    expect(result).toContain('class="yale-link"');
  });

  test('Should not modify text without Yale references', () => {
    const input = 'Welcome to Harvard University';
    expect(replaceYaleWithFale(input)).toBe(input);
  });

  test('Should handle special case for "no Yale references"', () => {
    const input = 'This page has no Yale references';
    const expected = 'This page has no Fale references';
    expect(replaceYaleWithFale(input)).toBe(expected);
  });

  test('Should handle Yale at the beginning of a sentence', () => {
    const input = 'Yale is a university';
    const expected = 'Fale is a university';
    expect(replaceYaleWithFale(input)).toBe(expected);
  });

  test('Should handle Yale at the end of a sentence', () => {
    const input = 'I go to Yale.';
    const expected = 'I go to Fale.';
    expect(replaceYaleWithFale(input)).toBe(expected);
  });

  test('Should handle Yale with punctuation', () => {
    const input = 'Yale, the university.';
    const expected = 'Fale, the university.';
    expect(replaceYaleWithFale(input)).toBe(expected);
  });

  test('Should handle Yale in different contexts', () => {
    const input = 'Yale-Harvard game, Yale\'s campus, Yale.edu';
    const expected = 'Fale-Harvard game, Fale\'s campus, Fale.edu';
    expect(replaceYaleWithFale(input)).toBe(expected);
  });

  test('Should handle empty input', () => {
    expect(replaceYaleWithFale('')).toBe('');
  });

  test('Should handle null input', () => {
    expect(replaceYaleWithFale(null)).toBe('');
  });

  test('Should handle undefined input', () => {
    expect(replaceYaleWithFale(undefined)).toBe('');
  });

  test('Should handle non-string input', () => {
    expect(replaceYaleWithFale(123)).toBe('123');
  });
});

describe('Content Processing', () => {
  test('Should process HTML content correctly', () => {
    const html = '<div>Yale University</div>';
    const result = processContent(html, 'text/html', 'https://example.com');
    
    expect(result).toContain('<div>Fale University</div>');
    expect(result).toContain('<base href="https://example.com">');
  });
  
  test('Should process JSON content correctly', () => {
    const json = JSON.stringify({ name: 'Yale University', location: 'New Haven' });
    const result = processContent(json, 'application/json');
    const parsed = JSON.parse(result);
    
    expect(parsed.name).toBe('Fale University');
    expect(parsed.location).toBe('New Haven');
  });
  
  test('Should process nested JSON content correctly', () => {
    const json = JSON.stringify({
      university: {
        name: 'Yale University',
        departments: [
          { name: 'Yale Computer Science', students: 100 },
          { name: 'Yale Engineering', students: 200 }
        ]
      }
    });
    
    const result = processContent(json, 'application/json');
    const parsed = JSON.parse(result);
    
    expect(parsed.university.name).toBe('Fale University');
    expect(parsed.university.departments[0].name).toBe('Fale Computer Science');
    expect(parsed.university.departments[1].name).toBe('Fale Engineering');
  });
  
  test('Should handle invalid JSON gracefully', () => {
    const invalidJson = '{ "name": "Yale University", invalid json';
    const result = processContent(invalidJson, 'application/json');
    
    expect(result).toContain('Fale University');
  });
  
  test('Should process plain text content correctly', () => {
    const text = 'Welcome to Yale University';
    const result = processContent(text, 'text/plain');
    
    expect(result).toBe('Welcome to Fale University');
  });
  
  test('Should handle empty content', () => {
    expect(processContent('', 'text/html')).toBe('');
    expect(processContent(null, 'text/html')).toBe('');
    expect(processContent(undefined, 'text/html')).toBe('');
  });
});
