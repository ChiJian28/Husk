const REFUSE_RE =
  /\b(call|calls|ape|pump|leverage|long call|buy call|sell (put|call|option)|butterfly|ranger|loan|max profit|yolo|moon)\b/i;

const ALLOW_RE =
  /\b(hedge|cover|protect|floor|insurance|insure|through|cpi|fomc|nfp|friday|premium|usdc|don'?t spend|drawdown|bag)\b/i;

export function guardUtterance(utterance: string): string | undefined {
  const t = utterance.trim();
  if (REFUSE_RE.test(t) && !/\b(put|put spread|coverage|cover|hedge|protect)\b/i.test(t)) {
    return 'Husk only underwrites long puts / put spreads (defined-risk coverage). No calls, no selling, no leverage.';
  }
  if (/\b(buy (eth )?calls|ape calls|max profit)\b/i.test(t)) {
    return 'Husk only underwrites long puts / put spreads (defined-risk coverage). No calls, no selling, no leverage.';
  }
  return undefined;
}

export function looksLikeCoverage(utterance: string): boolean {
  return ALLOW_RE.test(utterance) || /\bput\b/i.test(utterance);
}
