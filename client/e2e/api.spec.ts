import { randomUUID } from 'crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, pdfFile, briefingText, uniqueCode } from './fixtures';

/**
 * API-level E2E tests against the running server in mock LLM mode
 * (LLM_PROVIDER=mock): real HTTP, SSE, SQLite, Chroma and agent tools,
 * with a deterministic fake model.
 */

type SseEvent = { type: string; [key: string]: unknown };

const parseSse = (body: string): SseEvent[] =>
  body
    .split('\n\n')
    .filter((block) => block.startsWith('data: '))
    .map((block) => JSON.parse(block.slice('data: '.length)));

const ingest = async (request: APIRequestContext, api: string, name: string, text: string) => {
  const res = await request.post(`${api}/api/ingest`, { multipart: { file: pdfFile(name, text) } });
  expect(res.status()).toBe(200);
  return res.json();
};

test.describe('Health & configuration', () => {
  test('GET /healthz returns ok', async ({ request, apiBaseUrl }) => {
    const res = await request.get(`${apiBaseUrl}/healthz`);
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  test('GET /api/config reports the vector store', async ({ request, apiBaseUrl }) => {
    const data = await (await request.get(`${apiBaseUrl}/api/config`)).json();
    expect(data.vectorStore).toBe('CHROMA');
    expect(data.config.chroma.embeddingModel).toBe('mock');
  });

  test('GET /api/models returns the mock model as default', async ({ request, apiBaseUrl }) => {
    const res = await request.get(`${apiBaseUrl}/api/models`);
    expect(res.headers()['content-type']).toMatch(/json/);
    expect(await res.json()).toEqual({ models: ['mock-llm'], defaultModel: 'mock-llm' });
  });

  test('unknown routes return 404', async ({ request, apiBaseUrl }) => {
    const res = await request.get(`${apiBaseUrl}/api/invalid-endpoint`);
    expect(res.status()).toBe(404);
  });
});

test.describe('CORS', () => {
  test('allows the dev client origin', async ({ request, apiBaseUrl }) => {
    const res = await request.get(`${apiBaseUrl}/api/config`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(res.headers()['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('answers preflight requests', async ({ request, apiBaseUrl }) => {
    const res = await request.fetch(`${apiBaseUrl}/api/chat`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' },
    });
    expect(res.status()).toBe(204);
  });
});

test.describe('Chat validation', () => {
  const invalidBodies: Array<[string, unknown]> = [
    ['empty message', { message: '' }],
    ['missing message', { sessionId: randomUUID() }],
    ['too-long message', { message: 'a'.repeat(5001) }],
    ['non-uuid session', { message: 'hi', sessionId: 'not-a-uuid' }],
    ['invalid model type', { message: 'hi', model: 123 }],
  ];
  for (const [name, data] of invalidBodies) {
    test(`rejects ${name}`, async ({ request, apiBaseUrl }) => {
      const res = await request.post(`${apiBaseUrl}/api/chat`, { data });
      expect(res.status()).toBe(400);
      expect((await res.json()).type).toBe('VALIDATION_ERROR');
    });
  }

  test('rejects malformed JSON', async ({ request, apiBaseUrl }) => {
    const res = await request.post(`${apiBaseUrl}/api/chat`, {
      headers: { 'Content-Type': 'application/json' },
      data: 'invalid json {',
    });
    expect(res.status()).toBe(400);
  });

  test('rejects non-PDF uploads', async ({ request, apiBaseUrl }) => {
    const res = await request.post(`${apiBaseUrl}/api/ingest`, {
      multipart: {
        file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
      },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Agent over HTTP', () => {
  test('POST /api/chat uses a tool and persists the conversation', async ({
    request,
    apiBaseUrl,
  }) => {
    const sessionId = randomUUID();
    const res = await request.post(`${apiBaseUrl}/api/chat`, {
      data: { message: 'What is 6 * 7?', sessionId, model: 'any-model' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.answer).toBe('The result is 6 * 7 = 42.');
    expect(data.steps).toEqual([
      expect.objectContaining({ name: 'calculator', args: { expression: '6 * 7' } }),
    ]);
    expect(data.sessionId).toBe(sessionId);

    const history = await (await request.get(`${apiBaseUrl}/api/conversations/${sessionId}`)).json();
    expect(history.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant']);
    expect(history.messages[1].steps[0].name).toBe('calculator');
  });

  test('POST /api/chat/stream emits tool, token and done events', async ({
    request,
    apiBaseUrl,
  }) => {
    const codename = uniqueCode('SSE');
    const { documentId } = await ingest(request, apiBaseUrl, `${codename}.pdf`, briefingText(codename));

    const res = await request.post(`${apiBaseUrl}/api/chat/stream`, {
      data: { message: 'What is the project codename?', sessionId: randomUUID(), documentId },
    });
    expect(res.headers()['content-type']).toMatch(/text\/event-stream/);
    const events = parseSse(await res.text());
    const types = events.map((e) => e.type);

    expect(types[0]).toBe('start');
    expect(types.at(-1)).toBe('done');
    expect(types.indexOf('tool_call')).toBeLessThan(types.indexOf('tool_result'));
    expect(types.indexOf('tool_result')).toBeLessThan(types.indexOf('token'));
    expect(events.find((e) => e.type === 'tool_call')).toMatchObject({
      name: 'search_knowledge_base',
    });

    const done = events.at(-1) as SseEvent & { answer: string; citations: unknown[] };
    const tokens = events.filter((e) => e.type === 'token').map((e) => e.text);
    expect(tokens.join('')).toBe(done.answer);
    expect(done.answer).toContain(codename);
    expect(done.citations).toEqual([
      expect.objectContaining({ id: 1, source: `${codename}.pdf`, page: 1, documentId }),
    ]);
  });

  test('deleting a document removes it from search results', async ({ request, apiBaseUrl }) => {
    const codename = uniqueCode('DEL');
    const { documentId } = await ingest(request, apiBaseUrl, `${codename}.pdf`, briefingText(codename));
    const ask = async () =>
      (
        await request.post(`${apiBaseUrl}/api/chat`, {
          data: { message: `Which project is ${codename}?`, documentId },
        })
      ).json();

    const before = await ask();
    expect(before.citations.map((c: { documentId: string }) => c.documentId)).toEqual([documentId]);

    const del = await request.delete(`${apiBaseUrl}/api/documents/${documentId}`);
    expect(await del.json()).toMatchObject({ ok: true, vectorsDeleted: true });
    expect((await request.get(`${apiBaseUrl}/api/documents/${documentId}`)).status()).toBe(404);

    const after = await ask();
    expect(after.citations).toEqual([]);
    expect(after.answer).not.toContain(codename);
    expect(after.answer).toMatch(/could not find anything relevant/i);
  });

  test('a stated fact is saved as a memory', async ({ request, apiBaseUrl }) => {
    const name = uniqueCode('Name');
    const res = await request.post(`${apiBaseUrl}/api/chat`, {
      data: { message: `My name is ${name}`, sessionId: randomUUID() },
    });
    const data = await res.json();
    expect(data.steps[0].name).toBe('save_memory');

    const { memories } = await (await request.get(`${apiBaseUrl}/api/memories`)).json();
    const memory = memories.find((m: { content: string }) => m.content.includes(name));
    expect(memory).toMatchObject({ category: 'fact' });

    const del = await request.delete(`${apiBaseUrl}/api/memories/${memory.id}`);
    expect(del.ok()).toBeTruthy();
  });
});
