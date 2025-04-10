const request = require('supertest');
const nock = require('nock');
const app = require('../app');
const { sampleHtmlWithYale } = require('./test-utils');

describe('API Endpoints', () => {
  beforeAll(() => {
    // Enable real HTTP requests to our app
    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/localhost|127\.0\.0\.1/);
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  beforeEach(() => {
    // Reset mocks before each test
    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/localhost|127\.0\.0\.1/);
  });

  test('GET / should return the homepage', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Faleproxy');
  });

  test('GET /nonexistent should return 404', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.status).toBe(404);
  });

  test('POST /fetch should return 400 if URL is missing', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  test('POST /fetch should return 400 if URL is empty', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({ url: '' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  test('POST /fetch should fetch and replace Yale with Fale', async () => {
    // Mock the external URL request
    nock('https://example.com')
      .get('/')
      .reply(200, sampleHtmlWithYale);

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Check that Yale has been replaced with Fale in the content
    expect(response.body.content).toContain('Fale University');
    expect(response.body.content).not.toContain('<h1>Welcome to Yale University</h1>');
    expect(response.body.content).toContain('<h1>Welcome to Fale University</h1>');
    
    // Check that link text has been replaced
    expect(response.body.content).toContain('>About Fale<');
    expect(response.body.content).toContain('>Fale Admissions<');
  });

  test('POST /fetch should handle errors from external sites', async () => {
    // Mock a failed request
    nock('https://error-site.com')
      .get('/')
      .replyWithError('External site error');

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://error-site.com/' });
    
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('POST /fetch should handle malformed URLs', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'not-a-valid-url' });
    
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('POST /fetch should handle non-HTML responses', async () => {
    // Mock a JSON response
    const yaleData = { data: 'Yale University' };
    nock('https://api-site.com')
      .get('/')
      .reply(200, JSON.stringify(yaleData), { 'Content-Type': 'application/json' });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://api-site.com/' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Parse the JSON content and check for replacement
    const content = JSON.parse(response.body.content);
    expect(content.data).toBe('Fale University');
  });
});
