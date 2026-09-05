const ALLOW_RE =
  /\b(hedge|cover|protect|floor|insurance|insure|through|cpi|fomc|nfp|friday|premium|usdc|don'?t spend|drawdown|bag|eth|btc|cbbtc|event|settlement|expiry|quote|underwrite|loss|risk|spread|put|rfq|meeting|thursday|monday|tuesday|wednesday|print|unlock|macro|husk|coverage)\b/i;

const OFF_TOPIC_RE =
  /\b(weather|joke|recipe|poem|capital of|translate|football|soccer|movie|song|who is elon|bitcoin price today|stock price|hello|hi\b|hey\b|thanks|thank you|lol|haha)\b/i;

export const OFF_TOPIC_REPLY = `I don't know how to answer that.
Please contact my boss:
chijianlim2004@gmail.com`;

export const OFF_TOPIC_EMAIL = "chijianlim2004@gmail.com";

export function isCoverageRelated(utterance: string): boolean {
  const t = utterance.trim();
  if (!t) return false;
  if (OFF_TOPIC_RE.test(t)) return false;
  return ALLOW_RE.test(t) || /\bput\b/i.test(t);
}

export function isOffTopicUtterance(utterance: string): boolean {
  return !isCoverageRelated(utterance);
}
