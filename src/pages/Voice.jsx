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
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);
  const webhookUrl = useMemo(() => `${window.location.origin}/api/voice/incoming`, []);

  useEffect(() => {
    api.voiceStatus().then(setConfig).catch((reason) => setError(reason.message));
    return () => {
      recognitionRef.current?.stop?.();
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech input is unavailable in this browser. Type your message below instead.');
      return;
    }
    setVoiceError('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) setDraft((previous) => [previous.trim(), transcript].filter(Boolean).join(' '));
    };
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') setVoiceError('Microphone input could not start. Check your browser microphone permission, or type below.');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); }
    catch { setListening(false); setVoiceError('Microphone input is already active. Try again in a moment.'); }
  }

  async function sendVoiceMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || voiceBusy) return;
    setVoiceError('');
    setDraft('');
    setVoiceBusy(true);
    const priorMessages = messages.slice(-6).map(({ role, text: message }) => ({ role, text: message }));
    setMessages((previous) => [...previous, { role: 'user', text }]);
    try {
      const result = await api.voiceReply(text, priorMessages);
      setMessages((previous) => [...previous, { role: 'assistant', text: result.reply }]);
      if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(result.reply);
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    } catch (reason) {
      setVoiceError(reason.message || 'The assistant could not respond. Please try again.');
    } finally {
      setVoiceBusy(false);
    }
  }

  function endBrowserCall() {
    recognitionRef.current?.stop?.();
    window.speechSynthesis?.cancel?.();
    setListening(false);
    setMessages([]);
    setDraft('');
    setVoiceError('');
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
      <div><div className="eyebrow">COLLABDESKAI · CALL DESK</div><h1>Voice assistant<span className="heading-period">.</span></h1><p className="lead">A warm first response for collaboration calls, with a direct handoff to Aanya when callers ask.</p></div>
      <SetupStatus ready={ready}>{ready ? 'Phone line configured' : 'Phone setup required'}</SetupStatus>
    </div>

    {error && <div className="error-box" role="alert">{error}</div>}

    <section className="voice-hero">
      <div className="voice-orb" aria-hidden="true"><span>☎</span><i /><i /><i /></div>
      <div className="voice-hero-copy"><span className="voice-kicker">YOUR CALL RECEPTIONIST</span><h2>Calls get a thoughtful first response.</h2><p>The assistant greets callers, understands what they need, and can transfer them to a human. It keeps brief encrypted context only while the call is active.</p></div>
      <div className="voice-hero-state"><span className="voice-live-dot" />{config?.aiConfigured ? 'AI model configured' : 'Conversation fallback ready'}</div>
    </section>

    <Card className="voice-card voice-demo-card">
      <CardHeader>
        <div className="voice-demo-title"><div><CardTitle>Try the free browser assistant</CardTitle><CardDescription>Speak or type a message. {config?.aiConfigured ? 'Replies use the configured model when available; the built-in fallback takes over if it cannot respond.' : 'Replies use the built-in fallback until an AI model is configured.'}</CardDescription></div><SetupStatus ready={Boolean(config?.aiConfigured)}>{config?.aiConfigured ? 'Model configured' : 'Fallback replies'}</SetupStatus></div>
      </CardHeader>
      <CardContent>
        <div className="voice-demo-log" role="log" aria-live="polite" aria-relevant="additions text">
          {messages.length === 0 ? <p className="voice-demo-empty">Start by asking about a creator collaboration, a technical issue, or a call handoff.</p> : messages.map((message, index) => <div className={`voice-message is-${message.role}`} key={`${index}-${message.role}`}><span>{message.role === 'assistant' ? 'CollabDeskAI' : 'You'}</span><p>{message.text}</p></div>)}
          {voiceBusy && <p className="voice-demo-thinking" role="status">Assistant is responding…</p>}
        </div>
        <form className="voice-demo-form" onSubmit={sendVoiceMessage}>
          <textarea aria-label="Message for the voice assistant" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={700} placeholder={listening ? 'Listening…' : 'Type a message or use the microphone'} rows={2} />
          <div className="voice-demo-actions">
            <Button type="button" size="sm" variant="secondary" onClick={listening ? () => recognitionRef.current?.stop?.() : startListening} disabled={voiceBusy}>{listening ? 'Stop listening' : 'Use microphone'}</Button>
            <div className="voice-demo-actions-end">
              {messages.length > 0 && <Button type="button" size="sm" variant="ghost" onClick={endBrowserCall} disabled={voiceBusy}>End session</Button>}
              <Button type="submit" size="sm" disabled={!draft.trim() || voiceBusy}>{voiceBusy ? 'Thinking…' : 'Send'}</Button>
            </div>
          </div>
        </form>
        {voiceError && <p className="voice-demo-error" role="alert">{voiceError}</p>}
        <p className="voice-demo-note">Microphone access starts only when you press the button. Speech transcription is provided by your browser; voice replies use your browser’s speech engine. This browser demo does not place or receive phone calls.</p>
      </CardContent>
    </Card>

    <section className="voice-grid" aria-label="Voice assistant setup">
      <Card className="voice-card">
        <CardHeader><CardTitle>Connect your Twilio number</CardTitle><CardDescription>Set the webhook once, then send callers to the assistant.</CardDescription></CardHeader>
        <CardContent>
          <div className="voice-webhook"><div><span className="field-label">INCOMING VOICE WEBHOOK · HTTP POST</span><code>{webhookUrl}</code></div><Button size="sm" variant="secondary" onClick={copyWebhook}>{copied ? 'Copied' : 'Copy URL'}</Button></div>
          <ol className="voice-steps">
            <li><span>1</span><div><strong>Add private Vercel environment variables</strong><p><code>TWILIO_AUTH_TOKEN</code> validates calls from Twilio.</p><p><code>VOICE_TRANSFER_NUMBER</code> is the human handoff destination.</p><p><code>VOICE_WEBHOOK_BASE_URL</code> should be set to this site’s HTTPS origin.</p></div></li>
            <li><span>2</span><div><strong>Enable the voice model</strong><p>Set <code>OLLAMA_CHAT_URL</code> to a public Ollama-compatible chat endpoint. The local computer’s localhost URL cannot be reached by Vercel.</p><p>If your provider requires a bearer token, add <code>OLLAMA_API_KEY</code> as a Vercel Secret. CollabDesk sends it from the server and never returns it to the browser.</p></div></li>
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
