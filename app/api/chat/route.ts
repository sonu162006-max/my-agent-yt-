import { groq } from '@ai-sdk/groq';
import { streamText, convertToModelMessages, UIMessage } from 'ai';

// Conservative maximum duration for Vercel Hobby plan (free tier limit is 60s)
export const maxDuration = 30;

// Rate limiting state: in-memory map per client IP (20 requests per minute)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface IncomingMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  parts?: MessagePart[];
}

interface RequestPayload {
  messages?: IncomingMessage[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

  // Periodic cleanup of expired entries
  if (rateLimitMap.size > 1000) {
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((current.resetTime - now) / 1000));
    return { allowed: false, retryAfter };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function POST(req: Request) {
  // 1. IP rate limiting (20 requests per minute)
  const clientIp = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(clientIp);

  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: `Rate limit reached. Please wait ${retryAfter} seconds before trying again.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  // 2. Parse JSON request body
  let body: RequestPayload;
  try {
    body = (await req.json()) as RequestPayload;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rawMessages: IncomingMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  if (rawMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'At least one message is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Character limit check (maximum 4000 characters of input per request)
  const lastMessage = rawMessages[rawMessages.length - 1];
  let inputCharacterCount = 0;

  if (typeof lastMessage?.content === 'string') {
    inputCharacterCount = lastMessage.content.length;
  } else if (Array.isArray(lastMessage?.parts)) {
    inputCharacterCount = lastMessage.parts
      .filter((part): part is MessagePart & { text: string } => part?.type === 'text' && typeof part?.text === 'string')
      .reduce((sum: number, part) => sum + part.text.length, 0);
  }

  if (inputCharacterCount > 4000) {
    return new Response(
      JSON.stringify({
        error: 'Input exceeds the maximum limit of 4,000 characters per request.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Validate environment variable
  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({
        error: 'GROQ_API_KEY is not configured. Please add your key to .env.local.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 5. Memory: Buffer window of the last 10 interactions
  // (10 user/assistant exchanges = up to 20 messages)
  const trimmedMessages = rawMessages.slice(-20);

  // Normalize message parts for convertToModelMessages compatibility
  const normalizedMessages = trimmedMessages.map((msg) => {
    if (!msg.parts && typeof msg.content === 'string') {
      return {
        ...msg,
        parts: [{ type: 'text', text: msg.content }],
      };
    }
    return msg;
  });

  const modelMessages = await convertToModelMessages(normalizedMessages as unknown as UIMessage[]);

  // 6. Stream response using Groq provider and openai/gpt-oss-120b
  const result = streamText({
    model: groq('openai/gpt-oss-120b'),
    system:
      'You are a friendly, helpful AI assistant. Answer clearly and concisely, and remember what the user told you earlier in the conversation.',
    temperature: 0.7,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
