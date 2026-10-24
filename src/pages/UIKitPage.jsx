import React from 'react';
import { Avatar, Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label, Textarea } from '../components/ui/index.jsx';

const colors = [
  ['Indigo 500', '#6366f1', 'Primary action'],
  ['Indigo 600', '#4f46e5', 'Hover state'],
  ['Violet 600', '#7c3aed', 'Accent action'],
  ['Slate 900', '#0f172a', 'Primary text']
];

export default function UIKitPage({ go }) {
  return <div className="ui-kit">
    <header className="ui-kit__topbar">
      <div className="ui-kit__brand"><span className="ui-kit__brand-mark">C</span><span>CollabDesk UI</span></div>
      <a href="/" onClick={(event) => { event.preventDefault(); go('/'); }}>← Back to desk</a>
    </header>
    <main className="ui-kit__container">
      <section className="ui-kit__hero">
        <div><span className="ui-kit__eyebrow">Component library</span><h1>Clear, consistent building blocks.</h1><p>A small, accessible React UI kit using an 8px spacing rhythm, indigo and violet actions, slate text, and softly elevated cards.</p></div>
        <span className="ui-kit__version">CollabDesk UI · v1.0</span>
      </section>

      <section className="ui-kit__section" aria-labelledby="ui-colors-title">
        <div className="ui-kit__section-heading"><h2 id="ui-colors-title">Color tokens</h2><p>Primary actions, accents, and readable text</p></div>
        <div className="ui-kit__swatches">{colors.map(([name, value, use]) => <div className="ui-kit__swatch" key={name}><div className="ui-kit__swatch-color" style={{ backgroundColor: value }} /><div className="ui-kit__swatch-meta"><strong>{name}</strong><span>{value} · {use}</span></div></div>)}</div>
      </section>

      <section className="ui-kit__section" aria-labelledby="ui-buttons-title">
        <div className="ui-kit__section-heading"><h2 id="ui-buttons-title">Buttons</h2><p>Five variants and three sizes</p></div>
        <Card><CardContent><div className="ui-kit__row"><Button>Primary action</Button><Button variant="violet">Violet action</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Delete</Button></div><div className="ui-kit__row" style={{ marginTop: 24 }}><Button size="sm">Small</Button><Button>Default</Button><Button size="lg">Large button</Button><Button disabled>Disabled</Button></div></CardContent></Card>
      </section>

      <section className="ui-kit__section" aria-labelledby="ui-cards-title">
        <div className="ui-kit__section-heading"><h2 id="ui-cards-title">Cards & status</h2><p>12px corners with medium elevation</p></div>
        <div className="ui-kit__grid">
          <Card><CardHeader><CardTitle>Campaign overview</CardTitle><CardDescription>A compact surface for a summary and its next action.</CardDescription></CardHeader><CardContent><div className="ui-kit__row"><Badge>In review</Badge><Badge tone="violet">Creator campaign</Badge><Badge tone="success">On track</Badge><Badge tone="slate">Draft</Badge></div></CardContent><CardFooter><span className="ui-kit__helper">Updated just now</span><Button size="sm" variant="secondary">View details</Button></CardFooter></Card>
          <Card><CardContent><div className="ui-kit__row"><Avatar name="Aanya Kulkarni" /><div><strong>Aanya Kulkarni</strong><div className="ui-kit__helper">Creator · Pune</div></div><Badge tone="indigo">Available</Badge></div><div className="ui-kit__helper" style={{ marginTop: 24 }}>Card content uses a consistent 24px inset. Interactive elements keep visible keyboard focus.</div></CardContent></Card>
        </div>
      </section>

      <section className="ui-kit__section" aria-labelledby="ui-forms-title">
        <div className="ui-kit__section-heading"><h2 id="ui-forms-title">Form controls</h2><p>Labels, inputs, and helper text</p></div>
        <Card><CardContent><form className="ui-kit__form" onSubmit={(event) => event.preventDefault()}><div className="ui-kit__grid"><div className="ui-kit__field"><Label htmlFor="ui-kit-email">Email address</Label><Input id="ui-kit-email" type="email" placeholder="you@example.com" /><span className="ui-kit__helper">We’ll only use this for project updates.</span></div><div className="ui-kit__field"><Label htmlFor="ui-kit-topic">Project note</Label><Textarea id="ui-kit-topic" placeholder="Add a short note…" /></div></div><div><Button type="submit">Save changes</Button></div></form></CardContent></Card>
      </section>

      <section className="ui-kit__section" aria-labelledby="ui-spacing-title">
        <div className="ui-kit__section-heading"><h2 id="ui-spacing-title">Spacing & shape</h2><p>8px base unit · 12px standard radius · medium card shadow</p></div>
        <div className="ui-kit__grid"><Card><CardContent><div className="ui-kit__spacing">{[8, 16, 24, 32, 40].map((size) => <div className="ui-kit__spacing-item" key={size}><div className="ui-kit__spacing-bar" style={{ height: size }} /><span>{size}px</span></div>)}</div></CardContent></Card><div className="ui-kit__token-card"><span className="ui-kit__eyebrow">Surface token</span><h3 style={{ margin: '12px 0 8px', fontSize: 18 }}>Rounded white card</h3><p className="ui-kit__helper" style={{ lineHeight: 1.6, margin: 0 }}>Use a 12px radius and medium elevation to separate content from a slate-tinted canvas.</p></div></div>
      </section>
      <footer className="ui-kit__footer">Reusable React primitives live in <code>src/components/ui</code>. Import them from the library barrel to use them in a screen.</footer>
    </main>
  </div>;
}
