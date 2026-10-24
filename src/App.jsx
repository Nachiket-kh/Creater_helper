import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import { routeFor } from "./router.js";
import Voice from "./pages/Voice.jsx";
import collabDeskMark from "./assets/collabdesk-mark.svg";
import "./pages/studio.css";

const pages = [
  { id: "today", label: "Today", icon: "◷", href: "/" },
  { id: "inbox", label: "Inbox", icon: "↙", href: "/inbox" },
  { id: "deals", label: "Deals", icon: "▤", href: "/deals" },
  { id: "content", label: "Content", icon: "▦", href: "/content" },
  { id: "kit", label: "Media kit", icon: "▧", href: "/kit" },
  { id: "voice", label: "Voice assistant", icon: "☎", href: "/voice" },
];
const statuses = ["new", "negotiating", "confirmed", "posted", "paid"];
const statusLabels = { new: "New", negotiating: "Negotiating", confirmed: "Confirmed", posted: "Posted", paid: "Paid" };
const money = (value) => value == null ? "No fee" : `₹${Number(value).toLocaleString("en-IN")}`;
const number = (value) => Number(value || 0).toLocaleString("en-IN");

function Icon({ children, className = "" }) {
  const name = String(children);
  const paths = {
    "◷": <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    "↙": <><path d="M20 7v7a4 4 0 0 1-4 4H5"/><path d="m11 12-6 6 6 6" transform="translate(0 -1)"/></>,
    "▤": <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></>,
    "▦": <><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></>,
    "▧": <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    "↗": <><path d="M7 17 17 7M8 7h9v9"/></>,
    "↘": <><path d="M7 7 17 17M8 17h9V8"/></>,
    "＋": <><path d="M12 5v14M5 12h14"/></>,
    "→": <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    "←": <><path d="M19 12H5m6 6-6-6 6-6"/></>,
    "↻": <><path d="M20 11a8 8 0 0 0-14-5L4 8"/><path d="M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2"/><path d="M20 20v-4h-4"/></>,
    "✳": <><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8m0-12.8L5.6 18.4"/></>,
    "◉": <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></>,
    "◌": <><circle cx="12" cy="12" r="8" strokeDasharray="4 3"/></>,
    "!": <><circle cx="12" cy="12" r="9"/><path d="M12 8v5m0 3h.01"/></>,
    "✓": <path d="m5 12 4 4L19 6"/>,
    "×": <path d="m6 6 12 12M18 6 6 18"/>,
    "?": <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.8 1c-.8 1-2.4 1.3-2.4 3m0 3h.01"/></>,
    "⌄": <path d="m7 10 5 5 5-5"/>,
    "✦": <path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"/>,
  };
  return <span className={`icon ${className}`} aria-hidden="true">{paths[name] ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg> : children}</span>;
}

function ErrorMessage({ error }) {
  return error ? <div className="error-banner" role="alert"><Icon>!</Icon>{error}</div> : null;
}

function WorkspaceSetup({ onRetry }) {
  return <section className="workspace-setup" aria-labelledby="workspace-setup-title">
    <div className="workspace-setup-card">
      <span className="workspace-setup-mark" aria-hidden="true"><Icon>✳</Icon></span>
      <div className="eyebrow">WORKSPACE SETUP</div>
      <h1 id="workspace-setup-title">Finish connecting your creator workspace.</h1>
      <p className="workspace-setup-copy">The site is online, but its private workspace data stays locked until the production sign-in and storage providers are configured.</p>
      <div className="workspace-setup-status" role="status"><span className="workspace-setup-status-dot" /> Production setup is incomplete</div>
      <div className="workspace-setup-actions">
        <a className="primary-button" href="https://vercel.com/creator-os8/creater_helper/settings/environment-variables" target="_blank" rel="noreferrer">Open Vercel settings <span>↗</span></a>
        <button type="button" className="secondary-button" onClick={onRetry}>Check again <span>↻</span></button>
      </div>
      <p className="workspace-setup-note">After saving the production environment variables, redeploy this project. Your dashboard will load once the API confirms setup is complete.</p>
    </div>
  </section>;
}

function Loading({ label = "Loading your workspace…" }) {
  return <div className="loading"><span className="spinner" />{label}</div>;
}

function PageTitle({ eyebrow, title, subtitle, action }) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`}>{statusLabels[status] || status}</span>;
}

function DealCard({ deal, onStatus, onOpen, busy }) {
  const index = statuses.indexOf(deal.status);
  const previous = index > 0 ? statuses[index - 1] : null;
  const next = index < statuses.length - 1 ? statuses[index + 1] : null;
  return <article className="deal-card">
    <div className="deal-card-top"><StatusPill status={deal.status} />{deal.quote?.lowball && <span className="lowball"><i />Lowball</span>}</div>
    <button className="brand-link" onClick={() => onOpen(deal.id)}>{deal.brand}<Icon>↗</Icon></button>
    <div className="deal-meta">{money(deal.budgetInr)} <span>·</span> {deal.format}</div>
    <p className="deal-summary">{deal.summary}</p>
    <div className="deal-card-actions">
      {previous ? <button className="step-button" disabled={busy} onClick={() => onStatus(deal, previous)}>← {statusLabels[previous]}</button> : <span />}
      {next && <button className="step-button step-next" disabled={busy} onClick={() => onStatus(deal, next)}>{statusLabels[next]} →</button>}
    </div>
  </article>;
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [creator, setCreator] = useState(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const route = useMemo(() => routeFor(path), [path]);

  const navigate = useCallback((href) => {
    window.history.pushState({}, "", href);
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const pop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  useEffect(() => {
    api.creator().then((value) => { setCreator(value); setWorkspaceError(""); }).catch((error) => setWorkspaceError(error.message));
  }, [refresh]);

  const openDeal = (id) => navigate(`/deals/${encodeURIComponent(id)}`);
  const reload = () => setRefresh((value) => value + 1);
  const setupRequired = workspaceError === "Creator workspace sign-in is not configured for this deployment.";

  return <div className="app-shell">
    <aside className="sidebar">
      <a href="/" className="brand-mark" aria-label="CollabDesk home" onClick={(event) => { event.preventDefault(); navigate("/"); }}><img className="brand-glyph" src={collabDeskMark} alt="" /><span className="brand-wordmark"><span>collab</span><span className="brand-accent">desk</span></span></a>
      <div className="creator-mini">
        <div className="avatar">{creator?.name?.split(" ").map((part) => part[0]).slice(0, 2).join("") || "AK"}</div>
        <div className="creator-mini-copy"><strong>{creator?.name || "Aanya Kulkarni"}</strong><span>{creator?.handle || "@aanya.eats.pune"}</span></div>
        <span className={`online-dot ${setupRequired ? "offline" : ""}`} title={setupRequired ? "Workspace setup required" : "Workspace online"} />
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {pages.map((item) => <a key={item.id} href={item.href} title={item.label} aria-label={item.label} aria-current={route.page === item.id || (item.id === "deals" && route.page === "detail") ? "page" : undefined} className={`nav-link ${route.page === item.id || (item.id === "deals" && route.page === "detail") ? "active" : ""}`} onClick={(event) => { event.preventDefault(); navigate(item.href); }}><Icon>{item.icon}</Icon><span className="nav-link-label sr-only">{item.label}</span>{item.id === "inbox" && <span className="nav-dot" />}</a>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="sparkle">✳</span><div><strong>Your desk, in sync</strong><p>Every deal, detail and decision in one place.</p></div></div><button className="profile-link" onClick={() => navigate("/kit")}><div className="avatar avatar-small">{creator?.name?.split(" ").map((part) => part[0]).slice(0, 2).join("") || "AK"}</div><span><strong>{creator?.name || "Aanya Kulkarni"}</strong><small>Creator account</small></span><Icon>⌄</Icon></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {route.page === "detail" ? "Deal details" : pages.find((page) => page.id === route.page)?.label || "Not found"}</div><div className="topbar-right"><button className="voice-shortcut" onClick={() => navigate("/voice")} aria-label="Open voice assistant">☎ <span>Voice assistant</span></button><span className="today-date">{new Intl.DateTimeFormat("en-IN", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span><button className="icon-button" aria-label="Refresh workspace" title="Refresh workspace" onClick={reload}><Icon>↻</Icon></button><div className="top-avatar" aria-label={creator?.name || "Creator account"}>{creator?.name?.slice(0, 1) || "A"}</div></div></header>
      <div className="page-content">{setupRequired ? <WorkspaceSetup onRetry={reload} /> : <>
        <ErrorMessage error={workspaceError} />
        {route.page === "today" && <Today key={refresh} onOpen={openDeal} onNavigate={navigate} />}
        {route.page === "inbox" && <Inbox key={refresh} onOpen={openDeal} />}
        {route.page === "deals" && <Deals key={refresh} onOpen={openDeal} />}
        {route.page === "detail" && <DealDetail key={`${route.id}:${refresh}`} id={route.id} onBack={() => navigate("/deals")} onStatusChanged={() => setRefresh((value) => value + 1)} />}
        {route.page === "content" && <Content key={refresh} />}
        {route.page === "kit" && <Kit key={refresh} creator={creator} onSaved={(value) => { setCreator(value); setWorkspaceError(""); }} />}
        {route.page === "voice" && <Voice />}
        {route.page === "not-found" && <><PageTitle eyebrow="NOT FOUND" title="This page isn’t here." subtitle="The address may be out of date, or the page may have moved." action={<button className="primary-button" onClick={() => navigate("/")}>Back to Today <span>→</span></button>} /></>}
      </>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{pages.map((item) => <a key={item.id} href={item.href} title={item.label} aria-label={item.label} aria-current={route.page === item.id || (item.id === "deals" && route.page === "detail") ? "page" : undefined} className={route.page === item.id || (item.id === "deals" && route.page === "detail") ? "active" : ""} onClick={(event) => { event.preventDefault(); navigate(item.href); }}><Icon>{item.icon}</Icon><span className="sr-only">{item.label}</span></a>)}</nav>
    {!setupRequired && <DeskAssistant page={route.page} />}
  </div>;
}

function DeskAssistant({ page }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mayaListening, setMayaListening] = useState(false);
  const [mayaActive, setMayaActive] = useState(false);
  const launcherRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const mayaListeningRef = useRef(false);
  const mayaActiveRef = useRef(false);
  const assistantSpeakingRef = useRef(false);
  const askRef = useRef(null);
  const suggestions = ["How are my Reels performing?", "What new deals came in?", "Summarize my schedule and deadlines"];
  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape") { setOpen(false); launcherRef.current?.focus(); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  useEffect(() => () => {
    mayaListeningRef.current = false;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);
  function speakMaya(text) {
    if (!("speechSynthesis" in window)) return;
    assistantSpeakingRef.current = true;
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    const resumeListening = () => {
      assistantSpeakingRef.current = false;
      if (!mayaListeningRef.current || !recognitionRef.current) return;
      window.setTimeout(() => {
        if (!mayaListeningRef.current || !recognitionRef.current) return;
        try { recognitionRef.current.start(); } catch { /* The browser may still be releasing the microphone. */ }
      }, 250);
    };
    utterance.onend = resumeListening;
    utterance.onerror = resumeListening;
    window.speechSynthesis.speak(utterance);
  }
  async function ask(value = question, speak = false) {
    const prompt = value.trim().slice(0, 500);
    if (!prompt || loading) return;
    setQuestion(prompt); setError(""); setLoading(true);
    try {
      const result = await api.assistant(prompt, page);
      setAnswer(result);
      if (speak) speakMaya(result.answer);
    }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }
  askRef.current = ask;
  function toggleMaya() {
    if (mayaListeningRef.current) {
      mayaListeningRef.current = false;
      mayaActiveRef.current = false;
      recognitionRef.current?.stop();
      setMayaListening(false);
      setMayaActive(false);
      assistantSpeakingRef.current = false;
      window.speechSynthesis?.cancel();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Maya voice activation is not supported in this browser. You can still type your question.");
      setOpen(true);
      return;
    }
    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (!event.results[index].isFinal) continue;
        const transcript = event.results[index][0]?.transcript?.trim();
        if (!transcript) continue;
        const wake = transcript.match(/\bmaya\b[\s,.:;!?-]*(.*)/i);
        if (!mayaActiveRef.current && !wake) continue;
        let command = transcript;
        if (!mayaActiveRef.current) {
          mayaActiveRef.current = true;
          setMayaActive(true);
          setOpen(true);
          command = wake?.[1]?.trim() || "";
          if (!command) {
            speakMaya("I'm listening. What would you like to know?");
            continue;
          }
        } else {
          command = transcript.replace(/\bmaya\b/i, "").trim() || transcript;
        }
        setOpen(true);
        askRef.current?.(command, true);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        mayaListeningRef.current = false;
        setMayaListening(false);
        setMayaActive(false);
        mayaActiveRef.current = false;
        setError("Allow microphone access in your browser to use Maya voice activation.");
      }
    };
    recognition.onend = () => {
      if (!mayaListeningRef.current || assistantSpeakingRef.current) return;
      window.setTimeout(() => {
        if (!mayaListeningRef.current) return;
        try { recognition.start(); } catch { /* The browser may still be releasing the microphone. */ }
      }, 250);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      mayaListeningRef.current = true;
      mayaActiveRef.current = false;
      setMayaListening(true);
      setMayaActive(false);
      setOpen(true);
    } catch {
      setError("Could not start voice activation. Check microphone permission, then try again.");
    }
  }
  return <>
    {open && <section id="desk-assistant-panel" className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <div className="assistant-heading"><span className="assistant-mark"><Icon>✳</Icon></span><div><h2 id="assistant-title">Maya · desk assistant</h2><p>Ask by voice or text about your creator workspace</p></div><button className="assistant-close" aria-label="Close assistant" title="Close assistant" onClick={() => setOpen(false)}><Icon>×</Icon></button></div>
      <div className="assistant-voice-row"><button className={`assistant-voice-button ${mayaListening ? "is-listening" : ""}`} onClick={toggleMaya} aria-pressed={mayaListening}>{mayaListening ? "Stop Maya" : "Enable Maya voice"}</button><span role="status">{mayaListening ? mayaActive ? 'Maya is active · ask your question' : 'Listening for “Maya”…' : 'Tap to enable wake-word listening'}</span></div>
      <div className="assistant-disclosure">When enabled, say “Maya” to activate, then ask. Your question and workspace summary go to the configured backend model. Reel figures are saved workspace metrics, not a live Instagram connection; schedule summaries use deal deadlines and workspace actions, not a connected calendar.</div>
      {!answer && <div className="assistant-suggestions" aria-label="Suggested questions">{suggestions.map((item) => <button key={item} onClick={() => ask(item)} disabled={loading}>{item}</button>)}</div>}
      {answer && <div className="assistant-answer" aria-live="polite"><div className="assistant-answer-label"><span>{answer.source === "ai" ? "AI suggestion" : "Workspace insight"}</span>{answer.source !== "ai" && <span>Verified data</span>}</div><p>{answer.answer}</p><div className="assistant-suggestions assistant-followups">{(answer.suggestions || suggestions).map((item) => <button key={item} onClick={() => ask(item)} disabled={loading}>{item}</button>)}</div></div>}
      {error && <div className="assistant-error" role="alert">{error} <button onClick={() => ask()}>Try again</button></div>}
      {loading && <div className="assistant-loading" role="status"><span className="spinner spinner-small" /> Checking your workspace…</div>}
      <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); ask(); }}><label className="sr-only" htmlFor="assistant-question">Ask about your deals, rates, or content</label><input id="assistant-question" ref={inputRef} value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask Maya about your desk…" /><button className="assistant-send" disabled={loading || !question.trim()} aria-label="Ask assistant" title="Ask assistant"><Icon>→</Icon></button></form>
    </section>}
    <button ref={launcherRef} className={`assistant-launcher ${open ? "is-open" : ""}`} aria-label={open ? "Close Maya desk assistant" : mayaListening ? "Maya is listening" : "Open Maya desk assistant"} title={mayaListening ? "Maya is listening" : "Open Maya desk assistant"} aria-expanded={open} aria-controls={open ? "desk-assistant-panel" : undefined} onClick={() => setOpen((value) => !value)}><Icon>{open ? "×" : "✳"}</Icon><span>{open ? "Close" : mayaListening ? "Listening for Maya" : "Ask your desk"}</span></button>
  </>;
}

function Today({ onOpen, onNavigate }) {
  const [data, setData] = useState(null);
  const [deals, setDeals] = useState([]);
  const [content, setContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.today(), api.deals()]).then(([today, result]) => { setData(today); setDeals(result.deals); }).catch((reason) => setError(reason.message));
    api.content().then(setContent).catch(() => setContent(null)).finally(() => setContentLoading(false));
  }, []);
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Loading />;
  const counts = data.counts || {};
  const actionLink = (action, index) => {
    if (/^Reply to |^Chase payment from /.test(action)) {
      const brand = action.replace(/^Reply to |^Chase payment from /, "");
      return deals.find((deal) => deal.brand === brand)?.id;
    }
    return index === 2 ? "/content" : null;
  };
  const reels = (content?.posts || []).filter((post) => post.type?.toLowerCase() === "reel");
  const averageReach = reels.length ? Math.round(reels.reduce((sum, post) => sum + (Number(post.reach) || 0), 0) / reels.length) : 0;
  const averageSaves = reels.length ? Math.round(reels.reduce((sum, post) => sum + (Number(post.saves) || 0), 0) / reels.length) : 0;
  const pulsePosts = [...reels].sort((a, b) => (Number(b.reach) || 0) - (Number(a.reach) || 0)).slice(0, 4);
  const maxReach = Math.max(1, ...pulsePosts.map((post) => Number(post.reach) || 0));
  const upcomingDeals = deals.filter((deal) => deal.deadline && !/no deadline|unclear/i.test(deal.deadline)).slice(0, 3);
  return <>
      <PageTitle eyebrow={`${new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(new Date()).toUpperCase()} · YOUR CREATOR DESK`} title="A good day to make moves." subtitle="Your brand partnerships, all in one place." action={<button className="primary-button" onClick={() => onNavigate("/inbox")}><span>＋</span> Parse an email</button>} />
    <section className="stats-grid" aria-label="Deal counts">{statuses.map((status) => <div className="stat-card" key={status}><div className="stat-label">{statusLabels[status]}</div><div className="stat-value">{counts[status] || 0}</div><span className={`stat-mark mark-${status}`} /></div>)}</section>
    <section className="today-layout"><div className="panel actions-panel"><div className="section-heading"><div><div className="eyebrow">YOUR NEXT STEPS</div><h2>Today, at a glance</h2></div><span className="subtle-count">{data.actions.length} actions</span></div><div className="action-list">{data.actions.map((action, index) => { const destination = actionLink(action, index); return <button key={`${action}-${index}`} className={`action-row ${destination ? "action-clickable" : ""}`} disabled={!destination} onClick={() => { if (destination === "/content") onNavigate(destination); else if (destination) onOpen(destination); }}><span className={`action-number action-number-${index}`}>{String(index + 1).padStart(2, "0")}</span><span className="action-copy">{action}<small>{index === 0 ? "A reply keeps the conversation moving" : index === 1 ? "Close the loop on an outstanding payment" : "See the posts behind this insight"}</small></span><span className="action-arrow">{destination ? "↗" : "✓"}</span></button>; })}</div></div>
      <div className="panel focus-panel"><div className="eyebrow">IN FOCUS</div><div className="focus-art"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="focus-star">✳</span><span className="focus-spark focus-spark-a">✦</span><span className="focus-spark focus-spark-b">✧</span></div><h3>Built around your<br /><em>best work.</em></h3><p>See what resonates, know your worth, and make every partnership count.</p><button className="focus-link" onClick={() => onNavigate("/content")}>Explore your content <span>→</span></button></div></section>
    <section className="recent-section"><div className="section-heading"><div><div className="eyebrow">KEEP THINGS MOVING</div><h2>Recent deals</h2></div><button type="button" className="text-link" onClick={() => onNavigate("/deals")}>View all <span>→</span></button></div><RecentDeals deals={deals.slice(0, 3)} onOpen={onOpen} onNavigate={onNavigate} /></section>
    <section className="dashboard-insights" aria-label="Creator performance and schedule">
      <article className="panel pulse-panel">
        <div className="section-heading"><div><div className="eyebrow">CREATOR PULSE</div><h2>What’s resonating</h2></div><button type="button" className="text-link" onClick={() => onNavigate("/content")}>View insights <span>→</span></button></div>
        {content ? <>
          <div className="pulse-metrics"><div><span>Average Reel reach</span><strong>{number(averageReach)}</strong></div><div><span>Average saves</span><strong>{number(averageSaves)}</strong></div><div><span>Reels tracked</span><strong>{number(reels.length)}</strong></div></div>
          {pulsePosts.length ? <div className="pulse-chart" role="img" aria-label={`Top ${pulsePosts.length} Reels by saved reach`}>
            {pulsePosts.map((post) => <div className="pulse-bar-row" key={post.id || post.title}><span title={post.title}>{post.title}</span><div className="pulse-bar-track"><i style={{ width: `${Math.max(6, Math.round(((Number(post.reach) || 0) / maxReach) * 100))}%` }} /></div><strong>{number(post.reach)}</strong></div>)}
          </div> : <p className="pulse-empty">Add Reels to your content library to see performance here.</p>}
          <p className="data-source-note"><span>i</span> Saved demo metrics · Instagram isn’t connected</p>
        </> : contentLoading ? <div className="pulse-skeleton" aria-label="Loading creator insights"><span /><span /><span /></div> : <p className="pulse-empty">Creator insights couldn’t load right now. Try refreshing your desk.</p>}
      </article>
      <article className="panel schedule-panel">
        <div className="section-heading"><div><div className="eyebrow">ON YOUR RADAR</div><h2>Deal deadlines</h2></div><span className="subtle-count">Saved in your desk</span></div>
        {upcomingDeals.length ? <div className="deadline-list">{upcomingDeals.map((deal, index) => <button type="button" className="deadline-row" key={deal.id} onClick={() => onOpen(deal.id)}><span className={`deadline-icon deadline-icon-${index}`}>◷</span><span className="deadline-copy"><strong>{deal.brand}</strong><small>{deal.deadline}</small></span><StatusPill status={deal.status} /><Icon>↗</Icon></button>)}</div> : <div className="deadline-empty"><span className="deadline-empty-icon">✓</span><div><strong>You’re clear for now</strong><small>No deal deadlines are saved yet.</small></div></div>}
        <p className="data-source-note"><span>i</span> Deal notes only · No calendar connected</p>
      </article>
    </section>
  </>;
}

function RecentDeals({ deals, onOpen, onNavigate }) {
  if (!deals.length) return <div className="recent-empty"><span>No partnerships yet.</span><button className="text-link" onClick={() => onNavigate("/inbox")}>Parse your first email <span>→</span></button></div>;
  return <div className="recent-grid">{deals.map((deal) => <button key={deal.id} className="recent-card" onClick={() => onOpen(deal.id)}><span className="recent-monogram">{deal.brand.slice(0, 1)}</span><span className="recent-copy"><strong>{deal.brand}</strong><small>{money(deal.budgetInr)} · {deal.format}</small></span><StatusPill status={deal.status} /><Icon>↗</Icon></button>)}</div>;
}

function Inbox({ onOpen }) {
  const [samples, setSamples] = useState([]);
  const [rawEmail, setRawEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [draftingReply, setDraftingReply] = useState(false);
  const [replyDraft, setReplyDraft] = useState(null);
  const [replyCopied, setReplyCopied] = useState(false);
  const [error, setError] = useState("");
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailMessages, setGmailMessages] = useState([]);
  const [gmailError, setGmailError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  useEffect(() => { api.samples().then(setSamples).catch((reason) => setError(reason.message)); }, []);
  useEffect(() => {
    let active = true;
    let running = false;
    async function syncInbox() {
      if (running) return;
      running = true;
      try {
        const status = await api.gmailStatus();
        if (!active) return;
        setGmailStatus(status);
        if (status.connected) {
          const result = await api.gmailMessages();
          if (active) { setGmailMessages(result.messages || []); setGmailError(""); }
        }
      } catch (reason) {
        if (active) setGmailError(reason.message);
      } finally { running = false; }
    }
    syncInbox();
    const timer = window.setInterval(syncInbox, 5000);
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("gmail") === "connected";
    const connectionError = params.get("gmail_error");
    if (connected) setGmailError("Gmail is connected. Your recent inbox is syncing now.");
    else if (connectionError) {
      const messages = {
        account: "That Google account is not approved for this creator workspace.",
        refresh: "Google did not provide offline access. Revoke CollabDesk in Google Account settings, then connect again.",
        setup: "Gmail connection is not fully configured yet.",
        state: "The Google sign-in expired. Please try connecting again.",
        cancelled: "Gmail connection was cancelled.",
        connect: "Gmail could not connect. Check the Google Cloud and Supabase setup, then retry.",
      };
      setGmailError(messages[connectionError] || "Gmail could not connect.");
    }
    if (connected || connectionError) window.history.replaceState({}, "", window.location.pathname);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  async function parse(event) {
    event.preventDefault(); setError(""); setResult(null); setReplyDraft(null); setLoading(true);
    try { setResult(await api.parseEmail(rawEmail)); } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }
  async function demoEmail(event) {
    event.preventDefault(); setError(""); setResult(null); setReplyDraft(null); setLoading(true);
    try {
      const parsed = await api.parseEmail(rawEmail);
      setResult(parsed);
      setDraftingReply(true);
      const intent = parsed.deal.intent === "gifted" ? "decline" : "counter";
      setReplyDraft(await api.reply(parsed.deal.id, intent));
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); setDraftingReply(false); }
  }
  async function copyInboxReply() {
    try {
      await navigator.clipboard.writeText(`${replyDraft.subject}\n\n${replyDraft.body}`);
      setReplyCopied(true); window.setTimeout(() => setReplyCopied(false), 1800);
    } catch { setError("Could not copy the reply. Select the text and copy it instead."); }
  }
  async function disconnectGmail() {
    if (!window.confirm("Disconnect Gmail and remove its cached messages from CollabDesk?")) return;
    setDisconnecting(true);
    try {
      await api.disconnectGmail(); setGmailMessages([]); setGmailStatus((current) => ({ ...current, connected: false, email: null }));
      setGmailError("Gmail is disconnected and its cached messages were removed.");
    } catch (reason) { setGmailError(reason.message); }
    finally { setDisconnecting(false); }
  }
  async function useGmailMessage(message) {
    setLoadingMessage(message.gmail_message_id); setGmailError("");
    try {
      const { message: fullMessage } = await api.gmailMessage(message.gmail_message_id);
      setRawEmail(`From: ${fullMessage.from_name ? `${fullMessage.from_name} <${fullMessage.from_email}>` : fullMessage.from_email}\nSubject: ${fullMessage.subject}\n\n${fullMessage.body_text || fullMessage.snippet}`);
      setResult(null); setError(""); document.getElementById("raw-email")?.focus();
    } catch (reason) { setGmailError(reason.message); }
    finally { setLoadingMessage(""); }
  }
  return <>
    <PageTitle eyebrow="INBOX" title="A new note, handled." subtitle="Connect Gmail for incoming brand emails, or paste a message to get started." />
    <section className="gmail-panel" aria-label="Gmail connection">
      <div className="gmail-panel-heading"><span className="gmail-mark" aria-hidden="true">M</span><div><strong>{gmailStatus?.connected ? "Gmail is connected" : "Bring brand emails into CollabDesk"}</strong><small>{gmailStatus?.connected ? `${gmailStatus.email} · inbox checks every few seconds` : "New messages sync securely into this creator workspace."}</small></div></div>
      <div className="gmail-actions">{gmailStatus?.connected ? <button className="secondary-button" onClick={disconnectGmail} disabled={disconnecting}>{disconnecting ? "Disconnecting…" : "Disconnect"}</button> : gmailStatus?.configured ? <a className="primary-button gmail-connect" href="/api/gmail/connect">Connect Gmail <span>→</span></a> : <span className="gmail-setup-state">Connection setup needed</span>}</div>
      <p className="gmail-privacy-note">CollabDesk reads Inbox messages only. Email text is cached in Supabase for up to 30 days; parsing a selected message may send its text to OpenAI when AI is configured.</p>
      {gmailError && <p className="gmail-notice" role="status">{gmailError}</p>}
      {gmailStatus?.connected && <div className="gmail-message-list" aria-live="polite">{gmailMessages.length ? gmailMessages.map((message) => <article className="gmail-message" key={message.gmail_message_id}><div className="gmail-message-copy"><strong>{message.subject}</strong><span>{message.from_name || message.from_email} · {new Date(message.internal_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span><small>{message.snippet}</small></div><button className="text-link gmail-use-message" disabled={loadingMessage === message.gmail_message_id} onClick={() => useGmailMessage(message)}>{loadingMessage === message.gmail_message_id ? "Loading…" : "Use email"} <span>→</span></button></article>) : <p className="gmail-empty">{gmailError ? "Waiting for new mail…" : "Loading recent inbox messages…"}</p>}</div>}
    </section>
    <div className="inbox-layout"><form className="panel email-panel" onSubmit={parse}><div className="section-heading"><div><div className="eyebrow">START WITH A SAMPLE</div><h2>Try a familiar email</h2></div><span className="sample-count">{samples.length} samples</span></div><div className="sample-list">{samples.map((sample) => <button className={`sample-button ${rawEmail === sample.rawEmail ? "selected" : ""}`} type="button" key={sample.id} onClick={() => { setRawEmail(sample.rawEmail); setResult(null); setReplyDraft(null); setError(""); }}><span className="sample-letter">{sample.label.slice(0, 1)}</span><span>{sample.label}</span><Icon>↘</Icon></button>)}</div><label className="field-label" htmlFor="raw-email">Or paste an email</label><textarea id="raw-email" value={rawEmail} onChange={(event) => { setRawEmail(event.target.value); setResult(null); setReplyDraft(null); }} placeholder="Paste the brand's email here…" rows={9} required /><p className="privacy-disclosure">When AI is configured, this email text is sent to OpenAI for extraction. Otherwise, CollabDesk uses its offline parser.</p><div className="form-footer"><span className="privacy-note"><Icon>✳</Icon> Your rate is always your decision.</span><div className="button-row"><button type="submit" className="secondary-button" disabled={loading || !rawEmail.trim()}>Parse email</button><button type="button" className="primary-button" disabled={loading || !rawEmail.trim()} onClick={demoEmail}>{loading ? <><span className="spinner spinner-small" /> {draftingReply ? "Drafting reply…" : "Reading email…"}</> : <>Demo: draft a reply <span>→</span></>}</button></div></div><ErrorMessage error={error} /></form>
      <aside className="inbox-aside"><div className="panel inbox-tip"><div className="tip-icon">✦</div><div className="eyebrow">YOUR DESK, YOUR TERMS</div><h3>Know what’s in<br />the fine print.</h3><p>CollabDesk pulls out the budget, deliverables and usage window, then checks the offer against your own rates.</p><div className="tip-rule"><span>01</span> Your rate card sets the fee</div><div className="tip-rule"><span>02</span> You choose what to send</div></div>
      {result && <div className="result-card"><div className="result-top"><span className="result-icon">✓</span><span>Deal found</span>{result.quote?.lowball && <span className="lowball"><i />Lowball</span>}</div><h3>{result.deal.brand}</h3><div className="result-budget">{money(result.deal.budgetInr)} <span>· {result.deal.format}</span></div><div className="result-lines"><div><span>Deliverables</span><strong>{result.deal.deliverables.join(" + ")}</strong></div><div><span>Suggested fee</span><strong className="accent-text">{money(result.quote?.suggestedInr)}</strong></div><div className="result-summary">{result.deal.summary}</div></div>{result.source === "fallback" && <p className="offline-note">Shown from offline parser.</p>}{replyDraft && <div className="reply-editor inbox-reply-demo"><div className="editor-top"><span><span className="editor-dot" /> Reply draft ready</span><small>{replyDraft.source === "fallback" ? "Offline draft" : "AI-assisted draft"}</small></div><label className="field-label" htmlFor="inbox-reply-subject">Subject</label><input id="inbox-reply-subject" value={replyDraft.subject} onChange={(event) => setReplyDraft({ ...replyDraft, subject: event.target.value })} /><label className="field-label" htmlFor="inbox-reply-body">Message</label><textarea id="inbox-reply-body" rows={6} value={replyDraft.body} onChange={(event) => setReplyDraft({ ...replyDraft, body: event.target.value })} /><button className="secondary-button full-button" onClick={copyInboxReply}>{replyCopied ? "Copied ✓" : "Copy reply"}</button></div>}{draftingReply && <p role="status">Writing a reply from this email…</p>}<button className="secondary-button full-button" onClick={() => onOpen(result.deal.id)}>Open deal <span>↗</span></button></div>}
      </aside></div>
  </>;
}

function Deals({ onOpen }) {
  const [deals, setDeals] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => { api.deals().then((result) => setDeals(result.deals)).catch((reason) => setError(reason.message)); }, []);
  async function changeStatus(deal, status) {
    setBusy(deal.id); setError("");
    try { const saved = await api.setDealStatus(deal.id, status); setDeals((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved } : item)); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(""); }
  }
  return <><PageTitle eyebrow="DEAL BOARD" title="Every conversation, in motion." subtitle="A clear view of what’s new, what’s moving, and what’s wrapped." action={<span className="board-total">{deals?.length || 0} partnerships</span>} /><ErrorMessage error={error} />{!deals ? <Loading /> : <div className="board-grid">{statuses.map((status) => { const list = deals.filter((deal) => deal.status === status); return <section className="board-column" key={status}><div className="column-heading"><span className={`column-dot dot-${status}`} /><h2>{statusLabels[status]}</h2><span className="column-count">{list.length}</span></div><div className="column-cards">{list.map((deal) => <DealCard key={deal.id} deal={deal} busy={busy === deal.id} onStatus={changeStatus} onOpen={onOpen} />)}{!list.length && <div className="empty-column">Nothing here yet</div>}</div></section>; })}</div>}</>;
}

function DealDetail({ id, onBack, onStatusChanged }) {
  const [deal, setDeal] = useState(null);
  const [error, setError] = useState("");
  const [loadingReply, setLoadingReply] = useState("");
  const [reply, setReply] = useState(null);
  const [copied, setCopied] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  useEffect(() => { setDeal(null); setReply(null); setError(""); api.deal(id).then(setDeal).catch((reason) => setError(reason.message)); }, [id]);
  async function generate(intent) {
    setError(""); setLoadingReply(intent);
    try { setReply(await api.reply(id, intent)); }
    catch (reason) { setError(reason.message); }
    finally { setLoadingReply(""); }
  }
  async function updateStatus(status) {
    setSavingStatus(true); setError("");
    try { const updated = await api.setDealStatus(id, status); setDeal((current) => ({ ...current, ...updated })); onStatusChanged(); }
    catch (reason) { setError(reason.message); }
    finally { setSavingStatus(false); }
  }
  async function copyReply() {
    try { await navigator.clipboard.writeText(`${reply.subject}\n\n${reply.body}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setError("Could not copy the reply. Select the text and copy it instead."); }
  }
  if (!deal && !error) return <Loading />;
  if (!deal) return <><button className="back-link" onClick={onBack}>← Back to deals</button><ErrorMessage error={error} /></>;
  return <><button className="back-link" onClick={onBack}>← All deals</button><ErrorMessage error={error} /><div className="detail-heading"><div><div className="eyebrow">PARTNERSHIP DETAILS</div><h1>{deal.brand}</h1><p>{deal.summary}</p></div><StatusPill status={deal.status} /></div>
    <div className="detail-layout"><div className="detail-main"><section className="panel detail-facts"><div className="section-heading"><div><div className="eyebrow">THE BRIEF</div><h2>What they’re looking for</h2></div>{deal.quote?.lowball && <span className="lowball"><i />Lowball</span>}</div><div className="facts-grid"><Fact label="Offered budget" value={money(deal.budgetInr)} /><Fact label="Format" value={deal.format} /><Fact label="Deliverables" value={deal.deliverables.join(" + ")} /><Fact label="Deadline" value={deal.deadline} /><Fact label="Usage period" value={`${deal.usageDays} days`} /><Fact label="Intent" value={deal.intent.replaceAll("_", " ")} /></div></section>
      <section className="panel quote-panel"><div className="quote-icon">₹</div><div className="quote-copy"><div className="eyebrow">YOUR RATE, YOUR CALL</div><h2>Suggested fee <strong>{money(deal.quote?.suggestedInr)}</strong></h2><p>{deal.quote?.reason}</p></div><span className={`quote-signal ${deal.quote?.lowball ? "signal-low" : "signal-good"}`}>{deal.quote?.lowball ? "Below your rate" : "On your terms"}</span></section>
      <section className="panel reply-panel"><div className="section-heading"><div><div className="eyebrow">MAKE YOUR MOVE</div><h2>Draft a reply</h2></div><span className="subtle-count">You can edit before copying</span></div><p className="ai-disclosure">When AI is configured, saved deal details are sent to OpenAI for drafting. Review the message before you copy it.</p><div className="reply-actions">{[["accept", "Accept", "✓"], ["counter", "Counter", "↗"], ["decline", "Decline", "×"], ["ask_brief", "Ask for brief", "?" ]].map(([intent, label, icon]) => <button key={intent} className={`reply-choice ${intent === "counter" ? "reply-choice-primary" : ""}`} disabled={Boolean(loadingReply)} onClick={() => generate(intent)}>{loadingReply === intent ? <span className="spinner spinner-small" /> : <span>{icon}</span>}{label}</button>)}</div>{reply && <div className="reply-editor"><div className="editor-top"><span><span className="editor-dot" /> Draft ready</span>{reply.source === "fallback" && <small>Offline draft</small>}</div><label className="field-label" htmlFor="reply-subject">Subject</label><input id="reply-subject" value={reply.subject} onChange={(event) => setReply({ ...reply, subject: event.target.value })} /><label className="field-label" htmlFor="reply-body">Message</label><textarea id="reply-body" rows={7} value={reply.body} onChange={(event) => setReply({ ...reply, body: event.target.value })} /><button className="secondary-button" onClick={copyReply}>{copied ? "Copied ✓" : "Copy reply ↗"}</button></div>}</section></div>
      <aside className="detail-side"><section className="panel status-panel"><div className="eyebrow">DEAL STATUS</div><h3>Keep it up to date.</h3><label className="field-label" htmlFor="deal-status">Current stage</label><select id="deal-status" value={deal.status} disabled={savingStatus} onChange={(event) => updateStatus(event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><p>Status changes update your deal board right away.</p></section><section className="panel about-panel"><div className="eyebrow">A NOTE FROM YOUR DESK</div><p>Rates are calculated from your media kit. The writing assistant can help with the words; the fee stays yours.</p><span className="note-signature">Made for Aanya <span>✳</span></span></section></aside></div>
  </>;
}

function Fact({ label, value }) { return <div className="fact"><span>{label}</span><strong>{value || "—"}</strong></div>; }

function Content() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [repo, setRepo] = useState("Nachiket-kh/Creater_helper");
  const [creatorType, setCreatorType] = useState("video_creator");
  const [platform, setPlatform] = useState("x");
  const [draft, setDraft] = useState(null);
  const [draftError, setDraftError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reelBrief, setReelBrief] = useState({ topic: "", brand: "", duration: 30, goal: "saves", voice: "Warm and conversational" });
  const [reelScript, setReelScript] = useState(null);
  const [reelError, setReelError] = useState("");
  const [writingReel, setWritingReel] = useState(false);
  const [activeHook, setActiveHook] = useState(0);
  const [scriptCopied, setScriptCopied] = useState(false);
  useEffect(() => { api.content().then(setData).catch((reason) => setError(reason.message)); }, []);
  async function generateDraft() {
    setGenerating(true); setDraftError(""); setDraft(null);
    try { setDraft(await api.generateStudioDraft({ repo: repo.trim(), creatorType, platform })); }
    catch (reason) { setDraftError(reason.message); }
    finally { setGenerating(false); }
  }
  async function copyDraft() {
    if (!draft?.result?.draft) return;
    try { await navigator.clipboard.writeText(`${draft.result.title}\n\n${draft.result.draft}`); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setDraftError("Clipboard access is unavailable. Select and copy the draft text."); }
  }
  async function generateReel(event) {
    event.preventDefault(); setWritingReel(true); setReelError(""); setScriptCopied(false);
    try { setReelScript(await api.reelScript(reelBrief)); setActiveHook(0); }
    catch (reason) { setReelError(reason.message); }
    finally { setWritingReel(false); }
  }
  async function copyReel() {
    if (!reelScript) return;
    const text = `REEL SCRIPT · ${reelBrief.duration} seconds\n\nHOOK\n${reelScript.hooks[activeHook]}\n\n${reelScript.scenes.map((scene) => `${scene.seconds}\nFilm: ${scene.visual}\nSay: ${scene.voiceover}\nOn screen: ${scene.text}`).join("\n\n")}\n\nCAPTION\n${reelScript.caption}\n\nCTA\n${reelScript.cta}`;
    try { await navigator.clipboard.writeText(text); setScriptCopied(true); window.setTimeout(() => setScriptCopied(false), 1600); }
    catch { setReelError("Clipboard access is unavailable. Select and copy the script text."); }
  }
  return <><PageTitle eyebrow="CONTENT PULSE" title="Your work speaks." subtitle="A closer look at the posts people are spending time with." />{error ? <ErrorMessage error={error} /> : !data ? <Loading /> : <><div className="insight-banner"><div className="insight-mark">✳</div><div><div className="eyebrow">THE SIGNAL</div><h2>{data.insight}</h2></div><div className="insight-averages"><div><span>Food average</span><strong>{number(data.averages.food)}</strong><small>reach</small></div><div><span>Beauty average</span><strong>{number(data.averages.beauty)}</strong><small>reach</small></div></div></div>
    <section className="panel reel-writer"><div className="reel-writer-heading"><div><div className="eyebrow">YOUR NEXT REEL</div><h2>Write it in your voice.</h2><p>Scripts follow your creator profile and the posts your audience saved most.</p></div><span className="writer-mark">✦</span></div>
      <form className="writer-form" onSubmit={generateReel}><div className="writer-field writer-topic"><label className="field-label" htmlFor="reel-topic">What’s the reel about?</label><input id="reel-topic" maxLength={240} required value={reelBrief.topic} onChange={(event) => setReelBrief({ ...reelBrief, topic: event.target.value })} placeholder="e.g. Three must-order dishes at a Koregaon Park café" /></div>
        <div className="writer-field"><label className="field-label" htmlFor="reel-brand">Brand <span>(optional)</span></label><input id="reel-brand" maxLength={100} value={reelBrief.brand} onChange={(event) => setReelBrief({ ...reelBrief, brand: event.target.value })} placeholder="Organic post" /></div>
        <div className="writer-field"><label className="field-label" htmlFor="reel-duration">Length</label><select id="reel-duration" value={reelBrief.duration} onChange={(event) => setReelBrief({ ...reelBrief, duration: Number(event.target.value) })}>{[15, 30, 45, 60].map((duration) => <option key={duration} value={duration}>{duration} seconds</option>)}</select></div>
        <div className="writer-field"><label className="field-label" htmlFor="reel-goal">Goal</label><select id="reel-goal" value={reelBrief.goal} onChange={(event) => setReelBrief({ ...reelBrief, goal: event.target.value })}><option value="saves">More saves</option><option value="reach">More reach</option><option value="comments">More comments</option><option value="brand awareness">Brand awareness</option></select></div>
        <div className="writer-field"><label className="field-label" htmlFor="reel-voice">Voice</label><select id="reel-voice" value={reelBrief.voice} onChange={(event) => setReelBrief({ ...reelBrief, voice: event.target.value })}><option>Warm and conversational</option><option>Playful Hinglish</option><option>Minimal and aesthetic</option></select></div>
        <button className="primary-button writer-submit" disabled={writingReel || !reelBrief.topic.trim()}>{writingReel ? "Writing your reel…" : <>Build my reel <span>→</span></>}</button>
      </form>
      {reelError && <ErrorMessage error={reelError} />}
      {reelScript && <div className="script-result" aria-live="polite"><div className="script-result-top"><div><div className="eyebrow">YOUR SHOOT PLAN</div><h3>{reelBrief.topic}</h3></div><div className="script-source">{reelScript.source === "ai" ? "AI draft · review before filming" : "Creator data starter · no AI key needed"}</div></div>
        <section className="hook-lab"><div className="hook-heading"><div><span className="hook-spark">✳</span><div><div className="eyebrow">HOOK LAB</div><h4>Pick your opening</h4></div></div><span>3 options to test</span></div><div className="hook-options">{reelScript.hooks.map((hook, index) => <button type="button" key={`${hook}-${index}`} className={`hook-option ${activeHook === index ? "selected" : ""}`} aria-pressed={activeHook === index} onClick={() => { setActiveHook(index); setScriptCopied(false); }}><span className="hook-option-label">OPTION 0{index + 1} {activeHook === index && <b>✓ SELECTED</b>}</span><strong>{hook}</strong></button>)}</div><p className="hook-note">Test a different opening with the same reel body, then compare saves and comments on your next posts.</p></section>
        <div className="script-scenes">{reelScript.scenes.map((scene, index) => <article className="script-scene" key={`${scene.seconds}-${index}`}><span className="scene-number">{String(index + 1).padStart(2, "0")}</span><div className="scene-copy"><div className="scene-time">{scene.seconds}</div><p><b>Film</b> {scene.visual}</p><p><b>Say</b> {index === 0 ? reelScript.hooks[activeHook] : scene.voiceover}</p><p className="scene-overlay"><b>On screen</b> {scene.text}</p></div></article>)}</div>
        <div className="script-caption"><div className="eyebrow">CAPTION</div><p>{reelScript.caption}</p><div className="script-cta"><span>Close with</span><strong>{reelScript.cta}</strong></div></div><div className="script-footer"><p>{reelScript.rationale}</p><button type="button" className="secondary-button" onClick={copyReel}>{scriptCopied ? "Copied ✓" : "Copy full script ↗"}</button></div>
      </div>}
    </section>
    <section className="panel content-panel studio-panel"><div className="section-heading"><div><div className="eyebrow">GITHUB CREATOR STUDIO</div><h2>Turn repository changes into a draft</h2></div><span className="format-tag">Public repository</span></div><p className="studio-intro">Use recent commits, pull requests, discussions, and releases to shape a draft for your creator style and platform.</p><div className="studio-controls"><label><span className="field-label">GitHub repository</span><input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="owner/repository" autoComplete="off" /></label><label><span className="field-label">Creator style</span><select value={creatorType} onChange={(event) => setCreatorType(event.target.value)}><option value="tutorial_creator">Tutorial creator</option><option value="tech_blogger">Tech blogger</option><option value="video_creator">Video creator</option><option value="social_media_scholar">Social media creator</option></select></label><label><span className="field-label">Platform</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="github">GitHub</option><option value="x">X</option><option value="youtube">YouTube</option><option value="medium">Medium / Dev.to</option></select></label><button className="primary-button" onClick={generateDraft} disabled={generating || !repo.trim()}>{generating ? "Reading repository…" : "Generate draft ↗"}</button></div>
      {draftError && <ErrorMessage error={draftError} />}
      {draft && <div className="studio-result"><div className="studio-result-title"><div><span className="eyebrow">{draft.repo.name} · {platform.toUpperCase()}</span><h3>{draft.result.title}</h3></div><span className="format-tag">{draft.source === "ai" ? "AI draft" : "Local draft"}</span></div><p className="studio-hook">{draft.result.hook}</p><pre className="studio-draft">{draft.result.draft}</pre><div className="studio-result-actions"><span>{draft.result.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join("  ")}</span><button className="secondary-button" onClick={copyDraft}>{copied ? "Copied ✓" : "Copy draft"}</button></div>{draft.sources.length > 0 && <div className="studio-sources"><strong>Repository sources</strong>{draft.sources.slice(0, 4).map((source) => <a key={`${source.type}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">{source.type} · {source.title} ↗</a>)}</div>}{draft.source === "fallback" && <p className="subtle-count">The model is unavailable, so this draft uses a local template. Set a public model URL to enable AI generation.</p>}</div>}
      <p className="studio-footnote">Drafts are for review and copying; CollabDesk does not publish or schedule posts. Repository content is treated as source text, not instructions.</p></section>
    <section className="panel content-panel"><div className="section-heading"><div><div className="eyebrow">YOUR LIBRARY</div><h2>Posts & reels</h2></div><span className="subtle-count">{data.posts.length} posts</span></div><div className="table-wrap"><table><thead><tr><th>Post</th><th>Format</th><th>Topic</th><th>Reach</th><th>Saves</th><th>Collab</th></tr></thead><tbody>{data.posts.map((post) => <tr key={post.id}><td><span className={`post-icon topic-${post.topic}`}>{post.topic === "food" ? "✳" : post.topic === "beauty" ? "✦" : "↗"}</span><strong>{post.title}</strong></td><td><span className="format-tag">{post.type}</span></td><td className="topic-cell">{post.topic}</td><td>{number(post.reach)}</td><td>{number(post.saves)}</td><td><span className={`collab-tag ${post.collab ? "is-collab" : ""}`}>{post.collab ? "Partnered" : "Organic"}</span></td></tr>)}</tbody></table></div></section></>}</>;
}

function Kit({ creator, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (creator) setForm({ niche: creator.niche, followers: creator.followers, rates: { ...creator.rates } }); }, [creator]);
  function changeRate(format, value) { setForm((current) => ({ ...current, rates: { ...current.rates, [format]: value } })); setSaved(false); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setSaved(false); setError("");
    try { const result = await api.saveCreator({ niche: form.niche, followers: Number(form.followers), rates: Object.fromEntries(Object.entries(form.rates).map(([key, value]) => [key, Number(value)])) }); onSaved(result); setForm({ niche: result.niche, followers: result.followers, rates: { ...result.rates } }); setSaved(true); }
    catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }
  return <><PageTitle eyebrow="MEDIA KIT" title="Your work has a worth." subtitle="Your rates set the starting point for every partnership." /><div className="kit-layout">{!form ? <Loading /> : <><form className="panel kit-form" onSubmit={save}><div className="section-heading"><div><div className="eyebrow">CREATOR PROFILE</div><h2>The essentials</h2></div><div className="kit-avatar">{creator?.name?.split(" ").map((part) => part[0]).slice(0, 2).join("") || "AK"}</div></div><label className="field-label" htmlFor="niche">Your niche</label><input id="niche" maxLength={120} value={form.niche} onChange={(event) => { setForm({ ...form, niche: event.target.value }); setSaved(false); }} required /><div className="followers-field"><div><label className="field-label" htmlFor="followers">Followers</label><p>Your current audience size</p></div><div className="input-suffix"><input id="followers" type="number" min="0" max="1000000000" value={form.followers} onChange={(event) => { setForm({ ...form, followers: event.target.value }); setSaved(false); }} required /><span>people</span></div></div><div className="rate-heading"><div><label className="field-label">Your starting rates</label><p>Change any time. Your quotes follow.</p></div><span>INR · ₹</span></div><div className="rate-fields">{[["reel", "Reel", "◉"], ["post", "Feed post", "▧"], ["stories", "Stories", "◌"]].map(([format, label, icon]) => <label key={format} className="rate-field"><span className="rate-kind"><span>{icon}</span>{label}</span><span className="rate-input"><b>₹</b><input aria-label={`${label} rate in rupees`} type="number" min="1" max="1000000000" value={form.rates[format]} onChange={(event) => changeRate(format, event.target.value)} required /></span></label>)}</div><ErrorMessage error={error} /><div className="save-footer"><span>{saved ? <span className="saved-message">✓ Saved</span> : "Only you decide what feels right."}</span><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save changes"}<span>→</span></button></div></form>
      <aside className="kit-aside"><section className="panel kit-preview"><div className="eyebrow">YOUR RATE CARD</div><h3>{creator?.name || "Aanya Kulkarni"}</h3><div className="preview-handle">{creator?.handle || "@aanya.eats.pune"}</div><div className="preview-stats"><div><strong>{number(form.followers)}</strong><span>followers</span></div><div><strong>Pune</strong><span>based in</span></div></div><div className="preview-divider" />{[["Reel", "reel"], ["Feed post", "post"], ["Stories", "stories"]].map(([label, key]) => <div className="preview-rate" key={key}><span>{label}</span><strong>{money(Number(form.rates[key]))}</strong></div>)}</section><section className="panel house-rules"><div className="eyebrow">HOUSE RULES</div><h3>Good work, on your terms.</h3><ul><li>No alcohol brands</li><li>No second café brand in the same month</li><li>Usage rights included for 30 days only</li><li>Usage longer than 30 days adds 40 percent</li></ul><div className="rules-footer">These guardrails stay yours. <span>✳</span></div></section></aside></>}</div></>;
}
