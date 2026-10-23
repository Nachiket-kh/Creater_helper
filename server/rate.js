export function quote(creator, deal) {
  const format = deal.format || 'reel';
  const baseInr = creator.rates[format] ?? creator.rates.reel;
  const usageExtra = Number(deal.usageDays ?? 30) > 30;
  const suggestedInr = usageExtra ? Math.round((baseInr * 1.4) / 100) * 100 : baseInr;
  const hasBudget = typeof deal.budgetInr === 'number' && Number.isFinite(deal.budgetInr);
  const lowball = hasBudget && deal.budgetInr < baseInr * 0.7;
  let reason;
  if (!hasBudget) reason = 'No fee was offered; the suggested fee uses her usual rate.';
  else reason = `Their budget is ₹${deal.budgetInr.toLocaleString('en-IN')} and her base ${format} rate is ₹${baseInr.toLocaleString('en-IN')}${usageExtra ? ', with a 40% usage extension' : ''}.`;
  return { baseInr, suggestedInr, lowball, usageExtra, reason };
}

export function insight(posts) {
  const average = (topic) => {
    const matches = posts.filter((post) => post.topic === topic);
    return matches.length ? Math.round(matches.reduce((sum, post) => sum + post.reach, 0) / matches.length) : 0;
  };
  const food = average('food');
  const beauty = average('beauty');
  const text = food > beauty
    ? 'Food and commute reels outperform beauty posts. Prefer food collabs.'
    : `Beauty posts average ${beauty.toLocaleString('en-IN')} reach, compared with ${food.toLocaleString('en-IN')} for food posts. Favor the stronger topic.`;
  return { text, averages: { food, beauty } };
}

export function todayActions(deals, insightText) {
  const next = deals.find((deal) => deal.status === 'new');
  const posted = deals.find((deal) => deal.status === 'posted');
  return [next ? `Reply to ${next.brand}` : 'No new brand emails.', posted ? `Chase payment from ${posted.brand}` : 'No unpaid live posts.', insightText];
}
