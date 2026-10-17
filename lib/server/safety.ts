import type { ChatRequest } from "@/lib/types";

const CRISIS = /\b(suicid(?:e|al)|kill myself|end my life|end it all|want to die|don't want to live|do not want to live|hurt myself|self[- ]?harm|cut myself|overdose|khudkushi|marna chahta)\b/i;
const AGE_PATTERNS = [
  /\b(?:i am|i'm|im)\s+(\d{1,2})(?:\s*[- ]?years?\s*old)?\b/i,
  /\b(?:my age is|i just turned|i turned)\s+(\d{1,2})\b/i,
];

export function precheck(req: ChatRequest): "ok" | "crisis" | "minor" {
  const userMessages = req.messages.filter((message) => message.role === "user").map((message) => message.text);
  for (const text of userMessages) for (const pattern of AGE_PATTERNS) {
    const ageValue = text.match(pattern)?.[1];
    if (ageValue && Number(ageValue) < 18) return "minor";
  }
  const lastUser = userMessages.at(-1) ?? "";
  return CRISIS.test(lastUser) ? "crisis" : "ok";
}

