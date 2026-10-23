export function parsePrompt(rawEmail, correction = false) {
  return `You extract collaboration deals from brand emails sent to an Instagram creator in Pune.
Return one JSON object and nothing else. No markdown.

Schema:
{
  "brand": string,
  "intent": "paid_collab" | "gifted" | "spam" | "follow_up",
  "format": "reel" | "post" | "stories",
  "budgetInr": number | null,
  "deadline": string,
  "deliverables": string[],
  "summary": string,
  "usageDays": number
}

Rules:
- paid_collab only if they offer money.
- gifted if they offer product or exposure and no fee.
- spam if irrelevant or a scam.
- follow_up if it is unclear.
- Strip rupee symbols and commas from money. ₹8,000 becomes 8000.
- If no budget, budgetInr is null, not 0.
- If they do not mention usage time, usageDays is 30.
- summary is one sentence.
- Do not invent a higher budget than the email states.${correction ? '\nYour last answer was invalid JSON. Fix it.' : ''}

Email:
"""
${rawEmail}
"""`;
}

export function replyPrompt(intent, deal, suggestedInr) {
  return `Write an email that Aanya Kulkarni (@aanya.eats.pune) sends to the brand. Aanya is the sender and the brand is the recipient; write in Aanya's first-person voice. Never write as the brand or use the brand's point of view. Her niche is Pune food and city life.
Return JSON only: { "subject": string, "body": string }
The body is plain text, under 120 words, warm and direct, no hashtags, no emojis, no legal clauses.

Facts you must obey:
- Intent of this draft: ${intent}
- Brand: ${deal.brand}
- Their budget: ${deal.budgetInr ?? 'none'}
- Deliverables: ${deal.deliverables.join(', ')}
- Deadline: ${deal.deadline}
- Her fee, already decided, is ₹${suggestedInr}. Never change this number.
- Usage included: 30 days. Do not offer more.

If intent is counter, thank them, say their offer is below Aanya’s usual fee, and state her fee as ₹${suggestedInr} exactly. Make a clear counteroffer from Aanya. Do not suggest the brand should pay some amount other than her stated fee.
If intent is decline, do not negotiate.
If intent is accept, confirm deliverables, deadline, and fee.
If intent is ask_brief, ask for the product, the posting date, and usage days.

Deal summary: ${deal.summary}`;
}
