import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { UNDERWRITER_SYSTEM } from '../agent/prompts.js';
import type { HomeBrief } from './copy.js';

const BRIEF_SYSTEM = `${UNDERWRITER_SYSTEM}
You write the Husk home desk briefing shown on the dashboard.
Use ONLY facts from CONTEXT. Never invent USD amounts, coverage percentages, or event names.
Return ONLY valid JSON: {"kicker": string, "greeting": string, "summary": string}
- kicker: short status label (2–5 words)
- greeting: time-of-day greeting; keep the wallet suffix exactly as given in CONTEXT
- summary: 1–2 sentences, plain language, no markdown`;

function model(name: string) {
  return new ChatGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
    model: name,
    temperature: 0.2,
  });
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1]! : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no json');
  return JSON.parse(raw.slice(start, end + 1));
}

function isBrief(v: unknown): v is HomeBrief {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.kicker === 'string' &&
    o.kicker.length > 0 &&
    typeof o.greeting === 'string' &&
    o.greeting.length > 0 &&
    typeof o.summary === 'string' &&
    o.summary.length > 0
  );
}

export async function polishBriefWithGemini(
  context: Record<string, unknown>,
  draft: HomeBrief,
): Promise<HomeBrief | null> {
  const user = `CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nTEMPLATE (fallback — improve wording but keep facts):\n${JSON.stringify(draft)}`;
  try {
    const primary = model(env.GEMINI_MODEL);
    const res = await primary.invoke([new SystemMessage(BRIEF_SYSTEM), new HumanMessage(user)]);
    const text = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    const parsed = extractJson(text);
    if (!isBrief(parsed)) throw new Error('invalid brief shape');
    return {
      kicker: parsed.kicker.trim().slice(0, 80),
      greeting: parsed.greeting.trim().slice(0, 120),
      summary: parsed.summary.trim().slice(0, 600),
    };
  } catch (e) {
    logger.warn({ err: e instanceof Error ? e.message : e }, 'brief gemini primary failed');
    try {
      const fb = model(env.GEMINI_FALLBACK_MODEL);
      const res = await fb.invoke([new SystemMessage(BRIEF_SYSTEM), new HumanMessage(user)]);
      const text = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
      const parsed = extractJson(text);
      if (!isBrief(parsed)) return null;
      return {
        kicker: parsed.kicker.trim().slice(0, 80),
        greeting: parsed.greeting.trim().slice(0, 120),
        summary: parsed.summary.trim().slice(0, 600),
      };
    } catch (e2) {
      logger.warn({ err: e2 instanceof Error ? e2.message : e2 }, 'brief gemini fallback failed');
      return null;
    }
  }
}
