import { Annotation, END, MemorySaver, StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { AIMessage } from '@langchain/core/messages';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { CoverageIntentSchema, type CoverageIntent, type ExecutionPlan, type PolicyQuote } from '../types/policy.js';
import { HuskError } from '../errors.js';
import { quote as underwriteQuote } from '../underwriter/service.js';
import { buildExecutionPlan } from '../execution/encode.js';
import { getShelf } from '../calendar/service.js';
import { inferEventFromUtterance, inferNamedEvent } from '../calendar/pick.js';
import { insertAgentRun } from '../coverage/repo.js';
import { guardUtterance } from './guardrails.js';
import { PARSE_INSTRUCTION, UNDERWRITER_SYSTEM } from './prompts.js';
import { huskContextTools } from './tools.js';
import { policyUserSentence } from '../underwriter/copy.js';

export type AgentState = {
  utterance: string;
  wallet: string;
  intent?: CoverageIntent;
  quote?: PolicyQuote;
  plan?: ExecutionPlan;
  refusal?: string;
  clarify?: string;
  userSentence?: string;
};

const State = Annotation.Root({
  utterance: Annotation<string>(),
  wallet: Annotation<string>(),
  intent: Annotation<CoverageIntent | undefined>(),
  quote: Annotation<PolicyQuote | undefined>(),
  plan: Annotation<ExecutionPlan | undefined>(),
  refusal: Annotation<string | undefined>(),
  clarify: Annotation<string | undefined>(),
  userSentence: Annotation<string | undefined>(),
});

function model(name: string) {
  return new ChatGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
    model: name,
    temperature: 0.2,
  });
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === 'string' ? p : ((p as { text?: string }).text ?? '')))
      .join('');
  }
  return JSON.stringify(content);
}

async function invokeParse(system: string, user: string): Promise<string> {
  const llm = model(env.GEMINI_MODEL).bindTools(huskContextTools);
  const messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage> = [
    new SystemMessage(system),
    new HumanMessage(user),
  ];
  try {
    let res = await llm.invoke(messages);
    for (let i = 0; i < 4; i++) {
      const calls = res.tool_calls ?? [];
      if (!calls.length) return contentToText(res.content);
      messages.push(res);
      for (const tc of calls) {
        const t = huskContextTools.find((x) => x.name === tc.name);
        let out = `unknown tool ${tc.name}`;
        try {
          if (t) out = String(await (t as { invoke: (a: unknown) => Promise<unknown> }).invoke(tc.args));
        } catch (e) {
          out = e instanceof Error ? e.message : String(e);
        }
        messages.push(
          new ToolMessage({
            content: out,
            tool_call_id: tc.id ?? `${tc.name}-${i}`,
          }),
        );
      }
      res = await llm.invoke(messages);
    }
    return contentToText(res.content);
  } catch (e) {
    logger.warn({ err: e instanceof Error ? e.message : e }, 'parse tools fallback to plain generate');
    return invokeGemini(system, user);
  }
}

async function invokeGemini(system: string, user: string): Promise<string> {
  const primary = model(env.GEMINI_MODEL);
  try {
    const res = await primary.invoke([new SystemMessage(system), new HumanMessage(user)]);
    return typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
  } catch (e) {
    logger.warn({ err: e instanceof Error ? e.message : e }, 'MODEL_FALLBACK');
    const fb = model(env.GEMINI_FALLBACK_MODEL);
    const res = await fb.invoke([new SystemMessage(system), new HumanMessage(user)]);
    return typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
  }
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1]! : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no json');
  return JSON.parse(raw.slice(start, end + 1));
}

async function parseNode(s: typeof State.State): Promise<Partial<AgentState>> {
  const shelf = await getShelf();
  const catalog = [
    ...shelf.filter((e) => e.category === 'macro'),
    ...shelf.filter((e) => e.category !== 'macro'),
  ]
    .slice(0, 24)
    .map((e) => `${e.id} | ${e.name} | ${e.tsUtc}`)
    .join('\n');
  const text = await invokeParse(
    UNDERWRITER_SYSTEM,
    `${PARSE_INSTRUCTION}\nWallet: ${s.wallet}\nUtterance: ${s.utterance}\nShelf:\n${catalog}`,
  );
  try {
    const obj = extractJson(text) as Record<string, unknown>;
    const intent = CoverageIntentSchema.parse({
      wallet: s.wallet,
      asset: obj.asset ?? 'ETH',
      eventId: obj.eventId || undefined,
      customWindowEndUtc: obj.customWindowEndUtc || undefined,
      maxDrawdownPct: obj.maxDrawdownPct ?? 10,
      coverageFraction: obj.coverageFraction ?? 1,
      maxPremiumUsdc: obj.maxPremiumUsdc ?? 3,
    });
    const named = inferNamedEvent(s.utterance, shelf, intent.asset);
    if (named) {
      intent.eventId = named.id;
      intent.customWindowEndUtc = undefined;
    } else if (!intent.eventId && !intent.customWindowEndUtc) {
      const next = inferEventFromUtterance(s.utterance, shelf, intent.asset);
      if (next) intent.eventId = next.id;
    }
    return { intent };
  } catch {
    return {
      clarify: 'Need an event or a window (e.g. through Friday), a budget in USDC, and ETH vs BTC.',
    };
  }
}

function guardNode(s: typeof State.State): Partial<AgentState> {
  const refusal = guardUtterance(s.utterance);
  if (!refusal) return {};
  return { refusal, quote: undefined, plan: undefined, intent: undefined, userSentence: undefined };
}

async function underwriteNode(s: typeof State.State): Promise<Partial<AgentState>> {
  if (!s.intent) return {};
  try {
    const q = await underwriteQuote(s.intent);
    return { quote: q };
  } catch (e) {
    return { clarify: e instanceof Error ? e.message : 'underwrite failed' };
  }
}

async function explainNode(s: typeof State.State): Promise<Partial<AgentState>> {
  if (!s.quote) return {};
  const q = s.quote;
  let text = await invokeGemini(
    UNDERWRITER_SYSTEM,
    `Write ≤3 sentences for the user. This is a QUOTE plus unsigned calldata — do not say the coverage is bought, filled, or secured. Include these strings VERBATIM: ${q.totalDebitUsdc} and ${q.maxPayoutUsdc}. Event=${q.event.name}. Route=${q.route}. Quote id=${q.id}. Settlement=Chainlink TWAP.`,
  );
  if (!text.includes(q.totalDebitUsdc) || !text.includes(q.maxPayoutUsdc)) {
    logger.warn('explain fallback: model omitted amounts');
    text = policyUserSentence(q);
  }
  q.copy.userSentence = text.trim().slice(0, 800);
  return { quote: q, userSentence: q.copy.userSentence };
}

async function encodeNode(s: typeof State.State): Promise<Partial<AgentState>> {
  if (!s.quote) return {};
  try {
    const plan = await buildExecutionPlan(s.quote);
    return { plan };
  } catch (e) {
    if (e instanceof HuskError && (e.code === 'ALREADY_COVERED' || e.code === 'OPEN_RFQ_EXISTS')) {
      return { clarify: e.message };
    }
    throw e;
  }
}

function afterGuard(s: typeof State.State) {
  return s.refusal ? 'end' : 'parse';
}
function afterParse(s: typeof State.State) {
  if (s.clarify) return 'end';
  return 'underwrite';
}
function afterUnderwrite(s: typeof State.State) {
  if (s.clarify || !s.quote) return 'end';
  return 'explain';
}

let compiled: ReturnType<ReturnType<typeof buildGraph>['compile']> | undefined;
let checkpointer: PostgresSaver | MemorySaver | undefined;

function buildGraph() {
  return new StateGraph(State)
    .addNode('guard', guardNode)
    .addNode('parse', parseNode)
    .addNode('underwrite', underwriteNode)
    .addNode('explain', explainNode)
    .addNode('encode', encodeNode)
    .addEdge('__start__', 'guard')
    .addConditionalEdges('guard', afterGuard, { parse: 'parse', end: END })
    .addConditionalEdges('parse', afterParse, { underwrite: 'underwrite', end: END })
    .addConditionalEdges('underwrite', afterUnderwrite, { explain: 'explain', end: END })
    .addEdge('explain', 'encode')
    .addEdge('encode', END);
}

export async function getGraph() {
  if (compiled) return compiled;
  try {
    const pool = new pg.Pool({
      connectionString: env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
    const saver = new PostgresSaver(pool, undefined, { schema: 'husk_lg' });
    await saver.setup();
    checkpointer = saver;
    logger.info('langgraph postgres checkpointer ready');
  } catch (e) {
    logger.warn({ err: e instanceof Error ? e.message : e }, 'checkpointer fallback MemorySaver');
    checkpointer = new MemorySaver();
  }
  compiled = buildGraph().compile({ checkpointer });
  return compiled;
}

export async function runTurn(input: {
  wallet: string;
  utterance: string;
  threadId?: string;
}): Promise<{
  refusal?: string;
  clarify?: string;
  quote?: PolicyQuote;
  plan?: ExecutionPlan;
  userSentence?: string;
  langsmithUrl?: string;
  langsmithRunId?: string;
}> {
  const graph = await getGraph();
  const runId = randomUUID();
  const thread_id = input.threadId ?? input.wallet.toLowerCase();
  const out = await graph.invoke(
    {
      utterance: input.utterance,
      wallet: input.wallet.toLowerCase(),
      intent: undefined,
      quote: undefined,
      plan: undefined,
      refusal: undefined,
      clarify: undefined,
      userSentence: undefined,
    },
    { runId, configurable: { thread_id } },
  );
  const refused = Boolean(out.refusal);
  await insertAgentRun({
    wallet: input.wallet.toLowerCase(),
    langsmith_run_id: runId,
    input_text: input.utterance,
    output: { quoteId: refused ? undefined : out.quote?.id, refusal: out.refusal, clarify: out.clarify },
    refused,
    created_at: new Date().toISOString(),
  });
  const langsmithUrl = env.LANGCHAIN_API_KEY
    ? `https://smith.langchain.com/o/default/projects/p/${env.LANGCHAIN_PROJECT}`
    : undefined;
  return {
    refusal: out.refusal,
    clarify: out.clarify,
    quote: refused ? undefined : out.quote,
    plan: refused ? undefined : out.plan,
    userSentence: refused ? undefined : out.userSentence,
    langsmithUrl,
    langsmithRunId: runId,
  };
}
