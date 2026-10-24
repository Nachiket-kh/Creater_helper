export function parsePrompt(rawEmail) {
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
- Do not invent a higher budget than the email states.

Email:
"""
${rawEmail}
"""`;
}

export function replyPrompt(intent, deal, suggestedInr) {
  const formattedFee = `₹${suggestedInr.toLocaleString("en-IN")}`;
  return `Write a polished, natural email reply for creator Aanya Kulkarni (@aanya.eats.pune), who creates Pune food and city-life content.
Return one JSON object only: { "subject": string, "body": string }.
Write like a thoughtful person replying to a real business email: warm, concise, confident, and specific. Use plain text, 45–90 words, a simple greeting, short paragraphs, and a natural sign-off. Avoid stiff or repetitive language, filler, excessive apologies, hashtags, emojis, and legal wording. Never say both that she accepts and declines. Do not invent a recipient name or facts.

Facts you must obey:
- Intent of this draft: ${intent}
- Brand: ${deal.brand}
- Their budget: ${deal.budgetInr ?? "none"}
- Deliverables: ${deal.deliverables.join(", ")}
- Deadline: ${deal.deadline}
- Her fee, already decided, is ${formattedFee}. Use this exact currency formatting whenever stating her fee; never change the amount.
- Usage included: ${deal.usageDays} days. Do not offer more.

Intent-specific instructions (follow only the selected intent; never mix intents):
- counter: Follow this order: greeting; thank them for the offer; say she’d be happy to create ${deal.deliverables.join(" and ")} for ${formattedFee}, including ${deal.usageDays} days of usage; ask “Would that work for your budget?”; sign off. This is a negotiation, not a rejection. Do not say decline, pass, regret, or that she cannot proceed. Do not ask other questions or request more brief details.
- decline: Politely and clearly say she has to pass on the collaboration. Do not say she is happy or willing to create the deliverables, accept the offer, negotiate, or quote a fee. Thank them and close warmly.
- accept: Clearly confirm that she accepts. Include every deliverable exactly as listed (${deal.deliverables.join("; ")}), the deadline (${deal.deadline}), the fee (${formattedFee}), and the usage period (${deal.usageDays} days). Do not ask whether these terms work; the offer is accepted.
- ask_brief: Do not accept, decline, or counter and do not quote a fee. Ask questions about the product, posting date, and requested usage period before deciding.

Deal summary: ${deal.summary}`;
}

export function isUsableReplyDraft(reply, intent, suggestedInr, deal) {
  if (!reply || typeof reply.subject !== "string" || !reply.subject.trim() || reply.subject.length > 300 ||
      typeof reply.body !== "string" || !reply.body.trim() || reply.body.length > 5000) return false;

  const body = reply.body.toLowerCase();
  const fee = Number(suggestedInr).toLocaleString("en-IN");
  const hasFee = [`₹${fee}`, `₹${suggestedInr}`].some((amount) => reply.body.includes(amount));
  if (intent === "accept") {
    const allDeliverables = deal?.deliverables?.every((item) => body.includes(item.toLowerCase()));
    const deadline = deal?.deadline && body.includes(deal.deadline.toLowerCase());
    const usage = deal?.usageDays != null && body.includes(`${deal.usageDays} days`);
    const asksForApproval = /\?|would that work|does that work|if that works/.test(body);
    return hasFee && allDeliverables && deadline && usage && /\b(accept|confirm|happy to proceed)\b/.test(body) && !asksForApproval;
  }
  if (intent === "counter") {
    const contradictsCounter = /\b(regret|declin(?:e|ing)|pass on|cannot proceed|can't proceed|unable to proceed)\b/.test(body);
    const asksToProceed = /\b(if that works for your budget|would that work for your budget|does that work for your budget|could you confirm that works for your budget)\b/i.test(reply.body);
    const addsBriefQuestions = /\b(product|posting date|requested usage period|what date|tell me more)\b/i.test(reply.body);
    const allDeliverables = deal?.deliverables?.every((item) => body.includes(item.toLowerCase()));
    const usage = deal?.usageDays != null && body.includes(`${deal.usageDays} days`);
    return !contradictsCounter && hasFee && asksToProceed && !addsBriefQuestions && allDeliverables && usage;
  }
  if (intent === "decline") {
    const clearlyPasses = /\b(pass on|decline|not able to take|won't be able to|will have to pass)\b/.test(body);
    const alsoAccepts = /\b(happy|glad|delighted|pleased) to (?:create|do|work|offer|accept)|\baccept(?:ing)? the offer\b|\bmove forward\b/.test(body);
    return clearlyPasses && !alsoAccepts && !hasFee;
  }
  if (intent === "ask_brief") {
    const asksQuestions = body.includes("?");
    const asksProduct = /\bproduct\b/.test(body);
    const asksDate = /\b(posting date|post date|publish(?:ing)? date|when .*post)\b/.test(body);
    const asksUsage = /\b(usage|usage period|usage days)\b/.test(body);
    const takesPosition = /\b(accept|declin(?:e|ing)|counter offer|my fee is|would that work for your budget)\b/.test(body);
    return asksQuestions && asksProduct && asksDate && asksUsage && !takesPosition && !hasFee;
  }
  return false;
}

export function voiceAgentPrompt(history, callerText) {
  const priorTurns = history.map(({ role, text }) => `${role === 'assistant' ? 'CollabDeskAI' : 'Caller'}: ${text}`).join('\n');
  return `You are CollabDeskAI, a warm, concise phone assistant for Aanya Kulkarni, a creator in Pune. You answer incoming calls before Aanya and can offer to transfer the caller to her when they ask for a person.

Return only JSON: {"reply": string, "intent": "welcome" | "collaboration" | "technical_help" | "handoff" | "follow_up" | "unclear", "transfer": boolean}.

Voice and call rules:
- Sound natural, warm, professional, and easy to understand over a phone. Use short sentences and ask at most one question at a time.
- At the start, welcome the caller, identify yourself as CollabDeskAI, and ask what they need. In later turns, acknowledge what they said and use the conversation history; don't repeat the greeting.
- Work through creator collaboration ideation, feedback, live-session coordination, and post-session follow-up. Ask about the caller's goal and useful context before proposing a next step.
- For technical problems, stay calm and offer one simple troubleshooting step at a time. Never claim access to their device, streaming platform, calendar, or accounts.
- If context is unclear, say so briefly and ask the caller to repeat or clarify. If the call assistant has a technical issue, apologize and offer a human handoff.
- Never claim that you scheduled a meeting, sent a message, recorded a call, saved a note, contacted Aanya, or completed an external action. You have no such tools.
- Do not invent details, availability, commitments, or platform integrations. Do not request payment details, passwords, one-time codes, or unnecessary sensitive information.
- Set transfer=true only when the caller explicitly asks to speak to Aanya, a human, or an agent, or when they need help you cannot safely provide. Otherwise transfer=false.
- If the caller describes immediate danger, advise them to contact local emergency services. Do not claim to dispatch help.
- Keep the spoken reply under 45 words. For the last turn, intent is follow_up if the caller is done.

Conversation so far:
${priorTurns || '(This is the first turn.)'}

Caller just said:
"""
${callerText}
"""`;
}
