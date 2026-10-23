import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import Today from './pages/Today.jsx';
import Inbox from './pages/Inbox.jsx';
import Deals from './pages/Deals.jsx';
import DealDetail from './pages/DealDetail.jsx';
import Content from './pages/Content.jsx';
import Kit from './pages/Kit.jsx';

const todayStamp = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'short', day: '2-digit' }).format(new Date()).toUpperCase();
const nav = [['/', 'Today', '◷'], ['/inbox', 'Inbox', '↙'], ['/deals', 'Deals', '▤'], ['/content', 'Content', '▧'], ['/kit', 'Media kit', '✳']];
function routeFromPath(path) {
  if (path.startsWith('/deals/')) return { page: 'deal', id: decodeURIComponent(path.slice('/deals/'.length)) };
  return { page: ({ '/inbox': 'inbox', '/deals': 'deals', '/content': 'content', '/kit': 'kit' })[path] || 'today' };
}
export default function App() {
  const [route, setRoute] = useState(() => routeFromPath(location.pathname));
  const [creator, setCreator] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const pop = () => setRoute(routeFromPath(location.pathname)); window.addEventListener('popstate', pop);
    api.creator().then(setCreator).catch((e) => setError(e.message)); return () => window.removeEventListener('popstate', pop);
  }, []);
  const go = (path) => { history.pushState({}, '', path); setRoute(routeFromPath(path)); setError(''); window.scrollTo(0, 0); };
  const pageName = route.page === 'deal' ? 'Deal detail' : nav.find(([path]) => path === location.pathname)?.[1] || 'Today';
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark">C</div><div><strong>CollabDesk</strong><span>CREATOR WORKSPACE</span></div></div>
      <div className="creator-chip"><div className="avatar">AK</div><div><strong>{creator?.name || 'Aanya Kulkarni'}</strong><span>{creator?.handle || '@aanya.eats.pune'}</span></div><span className="online-dot" /></div>
      <nav className="nav-list">{nav.map(([path, label, icon]) => <a key={path} href={path} onClick={(e) => { e.preventDefault(); go(path); }} className={location.pathname === path ? 'active' : ''}><span className="nav-icon">{icon}</span>{label}{path === '/inbox' && <span className="nav-dot" />}</a>)}</nav>
      <div className="sidebar-bottom"><div className="offline-indicator"><span />Local demo ready</div><span>Built for the business behind the posts.</span></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb"><span>WORKSPACE</span><i>/</i><strong>{pageName}</strong></div><div className="topbar-right"><span className="date-stamp">{todayStamp}</span><div className="top-avatar">A</div></div></header>
      {error && <div className="global-error">{error}</div>}
      <div className="page-wrap">
        {route.page === 'today' && <Today go={go} />}
        {route.page === 'inbox' && <Inbox go={go} />}
        {route.page === 'deals' && <Deals go={go} />}
        {route.page === 'deal' && <DealDetail id={route.id} go={go} />}
        {route.page === 'content' && <Content />}
        {route.page === 'kit' && <Kit onCreator={setCreator} />}
      </div>
    </main>
  </div>;
}
