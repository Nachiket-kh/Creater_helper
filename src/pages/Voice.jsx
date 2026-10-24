import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/index.jsx';
import '../components/ui/ui.css';
import './voice.css';

function SetupStatus({ ready, children }) {
  return <span className={`voice-state ${ready ? 'is-ready' : 'is-pending'}`}><i />{children}</span>;
}

export default function Voice() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [demoText, setDemoText] = useState('');
  const [demoReply, setDemoReply] = useState('');
  const [demoError, setDemoError] = useState('');
  const [demoBusy, setDemoBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [demoHistory, setDemoHistory] = useState([]);
  const recognitionRef = useRef(null);
  const webhookUrl = useMemo(() => `${window.location.origin}/api/voice/incoming`, []);

  useEffect(() => {
    api.voiceStatus().then(setConfig).catch((reason) => setError(reason.message));
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function sendDemoTurn(value = demoText) {
    const text = value.trim();
    if (!text || demoBusy || !config?.browserDemoEnabled) return;
    setDemoBusy(true);
    setDemoError('');
    setDemoText(text);
    try {
      const result = await api.voiceDemoTurn(text, demoHistory);
      setDemoReply(result.reply);
      setDemoHistory((history) => [...history, { role: 'user', text }, { role: 'assistant', text: result.reply }].slice(-6));
      setDemoText('');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const spokenReply = new SpeechSynthesisUtterance(result.reply);
        spokenReply.lang = 'en-IN';
        window.speechSynthesis.speak(spokenReply);
      }
    } catch (reason) {
      setDemoError(reason.message);
    } finally {
      setDemoBusy(false);
    }
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setDemoError('Voice input is not supported in this browser. Type a message below to try the agent.');
      return;
    }
    setDemoError('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const spokenText = event.results?.[0]?.[0]?.transcript?.trim();
      if (spokenText) void sendDemoTurn(spokenText);
    };
    recognition.onerror = () => setDemoError('Microphone input failed. Check browser microphone permission or type a message.');
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setDemoError('Could not start microphone input. Try again or type a message.');
      setListening(false);
    }
  }

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access is unavailable. Copy the webhook URL manually.');
    }
  }

  const ready = Boolean(config?.twilioConfigured && config?.transferConfigured);
  return <main className="voice-page">
    <div className="page-heading voice-heading">
      <div><div className="eyebrow">COLLABDESKAI · VOICE AGENT</div><h1>Voice assistant<span className="heading-period">.</span></h1><p className="lead">Talk with the creator assistant here, or connect a phone number when telephony is ready.</p></div>
      <SetupStatus ready={Boolean(config?.browserDemoEnabled && config?.aiConfigured) || ready}>{config?.browserDemoEnabled && config?.aiConfigured ? 'Browser demo ready' : ready ? 'Twilio configured' : 'Setup required'}</SetupStatus>
    </div>

    {error && <div className="error-box" role="alert">{error}</div>}

    <section className="voice-hero">
      <div className="voice-orb" aria-hidden="true"><span>☎</span><i /><i /><i /></div>
      <div className="voice-hero-copy"><span className="voice-kicker">YOUR CREATOR ASSISTANT</span><h2>Try a live conversation in your browser.</h2><p>Use your microphone or type a message. The local voice demo sends turns to the backend model and speaks its replies without placing a phone call.</p></div>
      <div className="voice-hero-state"><span className="voice-live-dot" />{config?.aiConfigured ? 'AI model connected' : 'Conversation fallback ready'}</div>
    </section>

    <Card className="voice-card voice-demo-card">
      <CardHeader><CardTitle>Browser voice demo</CardTitle><CardDescription>No phone number or Twilio account needed for the hackathon walkthrough.</CardDescription></CardHeader>
      <CardContent>
        {!config?.browserDemoEnabled && <p className="voice-demo-note">Enable <code>VOICE_DEMO_ENABLED=true</code> in the local server environment to use this demo. It is intentionally disabled on Vercel.</p>}
        {config?.browserDemoEnabled && !config?.aiConfigured && <p className="voice-demo-note">Connect a local or hosted AI model before starting the demo.</p>}
        <div className="voice-demo-transcript" aria-live="polite">
          {demoHistory.length ? demoHistory.map((turn, index) => <p className={turn.role === 'assistant' ? 'voice-demo-agent' : 'voice-demo-user'} key={`${index}-${turn.role}`}><strong>{turn.role === 'assistant' ? 'CollabDeskAI' : 'You'}</strong>{turn.text}</p>) : <p className="voice-demo-empty">Your conversation will appear here.</p>}
          {demoBusy && <p className="voice-demo-empty">CollabDeskAI is thinking…</p>}
        </div>
        {demoError && <p className="voice-demo-error" role="alert">{demoError}</p>}
        <form className="voice-demo-form" onSubmit={(event) => { event.preventDefault(); void sendDemoTurn(); }}>
          <textarea aria-label="Speak or type a message" rows="2" maxLength="700" placeholder="Try: A brand wants a paid collaboration…" value={demoText} onChange={(event) => setDemoText(event.target.value)} disabled={demoBusy || !config?.browserDemoEnabled || !config?.aiConfigured} />
          <div className="voice-demo-actions">
            <Button type="button" variant="secondary" onClick={toggleListening} disabled={!config?.browserDemoEnabled || !config?.aiConfigured || demoBusy}>{listening ? 'Stop listening' : 'Use microphone'}</Button>
            <Button type="submit" disabled={!demoText.trim() || demoBusy || !config?.browserDemoEnabled || !config?.aiConfigured}>{demoBusy ? 'Thinking…' : 'Send turn'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <section className="voice-grid" aria-label="Voice assistant setup">
      <Card className="voice-card">
        <CardHeader><CardTitle>Connect your Twilio number</CardTitle><CardDescription>Set the webhook once, then send callers to the assistant.</CardDescription></CardHeader>
        <CardContent>
          <div className="voice-webhook"><div><span className="field-label">INCOMING VOICE WEBHOOK · HTTP POST</span><code>{webhookUrl}</code></div><Button size="sm" variant="secondary" onClick={copyWebhook}>{copied ? 'Copied' : 'Copy URL'}</Button></div>
          <ol className="voice-steps">
            <li><span>1</span><div><strong>Add private Vercel environment variables</strong><p><code>TWILIO_AUTH_TOKEN</code> validates calls from Twilio.</p><p><code>VOICE_TRANSFER_NUMBER</code> is the human handoff destination.</p><p><code>VOICE_WEBHOOK_BASE_URL</code> should be set to this site’s HTTPS origin.</p></div></li>
            <li><span>2</span><div><strong>Enable the phone-call model</strong><p>Set <code>OLLAMA_CHAT_URL</code> to a public Ollama-compatible chat endpoint. The local browser demo uses your computer's Ollama URL, which Vercel cannot reach.</p><p>If your hosted provider requires a bearer token, add <code>OLLAMA_API_KEY</code> as a Vercel Secret. CollabDesk sends it from the server and never returns it to the browser.</p></div></li>
            <li><span>3</span><div><strong>Point Twilio at this webhook</strong><p>In the Twilio number’s Voice settings, set “A call comes in” to the URL above and choose HTTP POST.</p></div></li>
          </ol>
          <div className="voice-private-note"><span>🔒</span><p>Keep Twilio secrets in Vercel Environment Variables. Do not paste them into this page or commit them to GitHub.</p></div>
        </CardContent>
      </Card>

      <div className="voice-side-stack">
        <Card className="voice-card voice-status-card">
          <CardHeader><CardTitle>Connection status</CardTitle><CardDescription>Only configuration status is shown here. Secret values are never returned.</CardDescription></CardHeader>
          <CardContent><ul className="voice-checks">
            <li><span>Twilio signature validation</span><SetupStatus ready={Boolean(config?.twilioConfigured)}>{config?.twilioConfigured ? 'Ready' : 'Needs Auth Token'}</SetupStatus></li>
            <li><span>Human call transfer</span><SetupStatus ready={Boolean(config?.transferConfigured)}>{config?.transferConfigured ? 'Ready' : 'Needs transfer number'}</SetupStatus></li>
            <li><span>AI conversation model</span><SetupStatus ready={Boolean(config?.aiConfigured)}>{config?.aiConfigured ? 'Connected' : 'Fallback mode'}</SetupStatus></li>
          </ul>{!config && !error && <p className="voice-small-note">Loading status…</p>}{config && !ready && <p className="voice-small-note">Add the required values in Vercel, then redeploy. Twilio calls will be rejected until signature validation is configured.</p>}</CardContent>
        </Card>
        <Card className="voice-card">
          <CardHeader><CardTitle>What the agent handles</CardTitle><CardDescription>Designed for natural, short phone turns.</CardDescription></CardHeader>
          <CardContent><ul className="voice-capabilities">
            <li><span>01</span><div><strong>Welcome & understand</strong><p>Greets callers and asks one clear question at a time.</p></div></li>
            <li><span>02</span><div><strong>Creator workflows</strong><p>Supports ideation, feedback, live sessions, and follow-up.</p></div></li>
            <li><span>03</span><div><strong>Calm technical help</strong><p>Offers safe, basic steps without pretending to control devices.</p></div></li>
            <li><span>04</span><div><strong>Human handoff</strong><p>Transfers callers to Aanya when they request a person.</p></div></li>
          </ul></CardContent>
        </Card>
      </div>
    </section>
    <p className="voice-disclosure">Calls are not recorded by this app. Short conversation context is encrypted in the call flow and expires after one hour. Without a configured public model URL, the assistant uses a concise deterministic fallback.</p>
  </main>;
}
