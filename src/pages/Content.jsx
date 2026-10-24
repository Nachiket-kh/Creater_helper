import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import './studio.css';

const creatorOptions = [
  ['tutorial_creator', 'Tutorial creator'],
  ['tech_blogger', 'Tech blogger'],
  ['video_creator', 'Video creator'],
  ['social_media_scholar', 'Social media creator']
];
const platformOptions = [
  ['github', 'GitHub'], ['x', 'X'], ['youtube', 'YouTube'], ['medium', 'Medium / Dev.to']
];

export default function Content() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [repo, setRepo] = useState('Nachiket-kh/Creater_helper');
  const [creatorType, setCreatorType] = useState('video_creator');
  const [platform, setPlatform] = useState('x');
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftError, setDraftError] = useState('');

  useEffect(() => { api.content().then(setData).catch((reason) => setError(reason.message)); }, []);
  const fmt = (number) => Number(number).toLocaleString('en-IN');

  async function generate() {
    setLoading(true);
    setDraftError('');
    setDraft(null);
    try { setDraft(await api.generateStudioDraft({ repo: repo.trim(), creatorType, platform })); }
    catch (reason) { setDraftError(reason.message); }
    finally { setLoading(false); }
  }

  async function copyDraft() {
    if (!draft?.result?.draft) return;
    try {
      await navigator.clipboard.writeText(`${draft.result.title}\n\n${draft.result.draft}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setDraftError('Clipboard access is unavailable. Select and copy the draft text.'); }
  }

  return <>
    <div className="page-heading">
      <div><div className="eyebrow">YOUR CONTENT, WITH CONTEXT</div><h1>What’s working<span className="heading-period">.</span></h1><p className="lead">Content insights and new creator drafts from real GitHub changes.</p></div>
      <span className="period-label">RECENT CONTENT</span>
    </div>
    {error && <div className="error-box">{error}</div>}
    {data && <>
      <section className="insight-banner"><div className="insight-spark">✳</div><div><span className="eyebrow">THE TAKEAWAY</span><h2>{data.insight}</h2></div><span className="insight-arrow">↗</span></section>
      <section className="average-row"><div className="average-card"><span>FOOD · AVG REACH</span><strong>{fmt(data.averages.food)}</strong><small>Across food posts</small></div><div className="average-card"><span>BEAUTY · AVG REACH</span><strong>{fmt(data.averages.beauty)}</strong><small>Across beauty posts</small></div><div className="average-note"><span className="note-icon">↗</span><p>Reach is a useful signal for where new brand collaborations can feel most natural.</p></div></section>
    </>}

    <section className="panel studio-panel">
      <div className="panel-heading"><div><span className="eyebrow">GITHUB CREATOR STUDIO</span><h2>Turn repository changes into a draft</h2></div><span className="studio-connected"><i /> Public repo</span></div>
      <p className="studio-intro">Nexo reads recent commits, pull requests, discussions, and releases, then shapes a draft for your creator style and platform.</p>
      <div className="studio-controls">
        <label><span>GITHUB REPOSITORY</span><input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="owner/repository" autoComplete="off" /></label>
        <label><span>CREATOR STYLE</span><select value={creatorType} onChange={(event) => setCreatorType(event.target.value)}>{creatorOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>PLATFORM</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}>{platformOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="button button-primary studio-generate" onClick={generate} disabled={loading || !repo.trim()}>{loading ? <><span className="spinner" /> Reading repo…</> : <>Generate draft <span>↗</span></>}</button>
      </div>
      {draftError && <div className="error-box" role="alert">{draftError}</div>}
      {draft && <div className="studio-result">
        <div className="studio-result-head"><div><span className="eyebrow">{draft.repo.name} · {platformOptions.find(([value]) => value === platform)?.[1]}</span><h3>{draft.result.title}</h3></div><span className={`studio-source ${draft.source === 'ai' ? 'is-ai' : ''}`}>{draft.source === 'ai' ? 'AI DRAFT' : 'LOCAL DRAFT'}</span></div>
        <p className="studio-hook">{draft.result.hook}</p>
        <pre className="studio-draft">{draft.result.draft}</pre>
        <div className="studio-result-actions"><div className="studio-tags">{draft.result.tags.map((tag, index) => <span key={`${tag}-${index}`}>#{tag.replace(/^#/, '')}</span>)}</div><button className="button button-secondary" onClick={copyDraft}>{copied ? 'Copied' : 'Copy draft'}</button></div>
        {draft.sources.length > 0 && <div className="studio-sources"><strong>Repository sources</strong>{draft.sources.slice(0, 5).map((source) => <a key={`${source.type}-${source.url}`} href={source.url} target="_blank" rel="noreferrer"><span>{source.type}</span>{source.title}<i>↗</i></a>)}</div>}
        {draft.source === 'fallback' && <p className="studio-note">The model endpoint is not configured or didn’t respond, so this draft uses a local template. Add `OLLAMA_CHAT_URL` to Vercel to enable AI generation.</p>}
      </div>}
      <p className="studio-footnote">Drafts are for review and copying. The app does not schedule or publish posts. Repository files and comments are treated as source text, not instructions.</p>
    </section>

    {data && <section className="panel content-table-panel"><div className="panel-heading"><div><span className="eyebrow">POST PERFORMANCE</span><h2>Recent posts</h2></div><span className="table-count">{data.posts.length} POSTS</span></div><div className="table-scroll"><table><thead><tr><th>POST</th><th>TYPE</th><th>TOPIC</th><th>REACH</th><th>SAVES</th><th>COLLAB</th></tr></thead><tbody>{data.posts.map((post) => <tr key={post.id}><td><strong>{post.title}</strong></td><td><span className="type-chip">{post.type}</span></td><td><span className={`topic-dot topic-${post.topic}`} />{post.topic}</td><td>{fmt(post.reach)}</td><td>{fmt(post.saves)}</td><td><span className={`collab-status ${post.collab ? 'yes' : ''}`}>{post.collab ? 'Yes' : 'No'}</span></td></tr>)}</tbody></table></div></section>}
  </>;
}
