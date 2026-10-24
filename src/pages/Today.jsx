import React, { useEffect, useState } from 'react';
import { api, titleCase } from '../api.js';
const todayStamp = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();
export default function Today({ go }) {
  const [data, setData] = useState(null); const [deals, setDeals] = useState([]); const [error, setError] = useState('');
  useEffect(() => { Promise.all([api.today(), api.deals()]).then(([today, all]) => { setData(today); setDeals(all.deals); }).catch((e) => setError(e.message)); }, []);
  const goAction = (text) => { const match = deals.find((deal) => text.includes(deal.brand)); go(match ? `/deals/${match.id}` : '/content'); };
  return <><div className="page-heading"><div><div className="eyebrow">{todayStamp.replace(',', ' ·')}</div><h1>Good morning, Aanya<span className="heading-period">.</span></h1><p className="lead">Your creator desk, clear and under control.</p></div><button className="button button-primary" onClick={() => go('/inbox')}><span>＋</span> Log a collaboration</button></div>
    {error && <div className="error-box">{error}</div>}
    <section className="metric-strip">{data && [['new','New'],['negotiating','Negotiating'],['confirmed','Confirmed'],['posted','Posted'],['paid','Paid']].map(([key,label]) => <div className="metric-card" key={key}><span>{label}</span><strong>{String(data.counts[key]).padStart(2,'0')}</strong></div>)}</section>
    <div className="section-head"><div><span className="eyebrow">YOUR NEXT MOVES</span><h2>Today’s desk</h2></div><span className="quiet-label">3 things to keep moving</span></div>
    <section className="action-list">{(data?.actions || ['Loading your next move…','Loading payment follow-up…','Loading your content insight…']).map((action,i) => <button className="action-row" key={i} onClick={() => goAction(action)}><span className={`action-number n${i}`}>0{i+1}</span><span className="action-copy"><strong>{action}</strong><small>{i===0?'A brand is waiting for your response':i===1?'A live collaboration needs a payment follow-up':'A quick read from your recent content'}</small></span><span className="action-arrow">↗</span></button>)}</section>
    <section className="bottom-note"><div className="note-icon">✳</div><div><strong>A better kind of busy.</strong><p>One place for the work, the numbers, and what comes next.</p></div><button className="text-button" onClick={() => go('/content')}>See your content ↗</button></section>
  </>;
}
