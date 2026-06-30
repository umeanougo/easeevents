const defaultModel = "gpt-5.4-nano";
const defaultMaxCompletionTokens = 900;
const defaultTranscriptCharLimit = 12000;

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || defaultModel;
}

export function getOpenAIMaxCompletionTokens() {
  return readPositiveInteger(process.env.OPENAI_MAX_COMPLETION_TOKENS, defaultMaxCompletionTokens);
}

export function limitOpenAITranscript(text: string) {
  const limit = readPositiveInteger(
    process.env.OPENAI_TRANSCRIPT_CHAR_LIMIT,
    defaultTranscriptCharLimit,
  );
  return text.slice(0, limit);
}
