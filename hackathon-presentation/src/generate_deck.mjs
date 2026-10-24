import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const W=1280,H=720;
const C={ink:'#111827',paper:'#F6F4EE',white:'#FFFFFF',muted:'#697386',line:'#D9D8D2',coral:'#F26C4F',lime:'#C8F36B',blue:'#7695FF',navy:'#172033',pale:'#E8E5DC',soft:'#FCE1D9',green:'#E7F4D0'};
const pres=Presentation.create({slideSize:{width:W,height:H}});
const noLine={style:'solid',fill:'none',width:0};
function shape(slide,geometry,x,y,w,h,fill='none',line=noLine,name){return slide.shapes.add({geometry,name,position:{left:x,top:y,width:w,height:h},fill,line});}
function box(slide,x,y,w,h,fill,r=0,name){return shape(slide,r?'roundRect':'rect',x,y,w,h,fill,noLine,name);}
function txt(slide,text,x,y,w,h,size=22,color=C.ink,bold=false,opts={}){
  const s=shape(slide,'textbox',x,y,w,h,'none',noLine,opts.name);
  s.text=text;
  s.text.style={fontSize:size,bold,color,typeface:'Arial',alignment:opts.align||'left',verticalAlignment:opts.valign||'top',wrap:'square',autoFit:'shrinkText',insets:opts.insets??0,lineSpacing:opts.lineSpacing||1.08};
  return s;
}
function circle(slide,x,y,d,fill){return shape(slide,'ellipse',x,y,d,d,fill,noLine);}
function pill(slide,text,x,y,w,fill,color=C.ink){box(slide,x,y,w,32,fill,16);txt(slide,text,x+12,y+7,w-24,18,12,color,true);}
function base(slide,n,dark=false){
  slide.background.fill=dark?C.navy:C.paper;
  if(n>1){txt(slide,'COLLABDESK',72,32,170,20,12,dark?'#C5CBD5':C.muted,true);txt(slide,String(n).padStart(2,'0'),1160,32,48,20,12,dark?'#C5CBD5':C.muted,true,{align:'right',name:'slide-number'});}
}
function title(slide,kicker,heading,sub,dark=false){
  txt(slide,kicker.toUpperCase(),72,82,700,22,13,dark?C.lime:C.coral,true);
  txt(slide,heading,72,116,1090,80,42,dark?C.white:C.ink,true,{lineSpacing:0.98});
  if(sub)txt(slide,sub,72,204,1010,55,19,dark?'#C5CBD5':C.muted,false,{lineSpacing:1.15});
}
function notes(slide,text){slide.speakerNotes.text=text;}

// 1 — cover
{
 const s=pres.slides.add();base(s,1,true);
 circle(s,935,84,244,C.coral);circle(s,1012,337,114,C.lime);circle(s,839,443,62,C.blue);
 box(s,900,185,220,14,C.white,7);box(s,900,214,160,14,C.white,7);box(s,900,243,196,14,C.white,7);
 txt(s,'HACKATHON PITCH',72,76,330,24,14,C.lime,true);
 txt(s,'Collab\nDesk',72,139,720,218,76,C.white,true,{lineSpacing:0.87});
 txt(s,'Make every brand inquiry a better deal.',76,387,690,70,27,'#E4E8EF',false);
 pill(s,'CREATOR × BRAND WORKFLOW',76,497,267,'#2A3549',C.white);
 txt(s,'Attraction → Motion → Transformation',76,566,690,30,19,C.lime,true);
 txt(s,'A creator-first desk for turning inbound emails into clear, reviewable partnership decisions.',76,610,720,48,16,'#B9C2D0',false);
 notes(s,'Project context taken from the CollabDesk workspace README and prototype. Demo currently uses seeded creator and deal data.');
}
// 2 — problem
{
 const s=pres.slides.add();base(s,2);title(s,'The gap','A brand email starts a workflow, not a partnership','Creators still have to turn scattered details into decisions and follow-ups.');
 const items=[
  ['01','INQUIRIES','Terms arrive in free-form messages.'],
  ['02','DECISIONS','Budget, deliverables and usage are easy to miss.'],
  ['03','FOLLOW-THROUGH','Replies and payment follow-ups compete with making content.']
 ];
 items.forEach((it,i)=>{const x=72+i*380;box(s,x,314,350,260,i===1?C.soft:C.white,14);txt(s,it[0],x+22,336,55,34,18,C.coral,true);txt(s,it[1],x+22,390,295,28,14,C.muted,true);txt(s,it[2],x+22,438,292,92,24,C.ink,true,{lineSpacing:1.02});box(s,x+22,535,44,5,i===1?C.coral:C.lime,2);});
 txt(s,'The opportunity: make the business side feel as manageable as the creative side.',72,617,1060,34,19,C.ink,true);
 notes(s,'Problem framing is a product hypothesis based on the workflow CollabDesk addresses; no market-size or user-research claims are asserted.');
}
// 3 — workflow story
{
 const s=pres.slides.add();base(s,3,true);title(s,'Product idea','Attraction → Motion → Transformation','One desk that helps creators find fit, move faster, and protect the value of each deal.',true);
 const cols=[
  {x:72,num:'01',name:'ATTRACT',color:C.coral,lead:'Find the right fit',body:'Use creator context and content patterns to focus on partnerships that make sense.'},
  {x:470,num:'02',name:'MOTION',color:C.blue,lead:'Move the deal forward',body:'Turn an email into a deal card, compare the offer with the rate card, draft a reply.'},
  {x:868,num:'03',name:'TRANSFORMATION',color:C.lime,lead:'Build a better business',body:'Keep terms, status and follow-ups visible so creators can make deliberate choices.'}
 ];
 cols.forEach((c,i)=>{circle(s,c.x,316,68,c.color);txt(s,c.num,c.x,338,68,24,17,C.ink,true,{align:'center'});txt(s,c.name,c.x,407,300,23,13,c.color,true);txt(s,c.lead,c.x,448,315,38,26,C.white,true);txt(s,c.body,c.x,502,315,90,18,'#C5CBD5',false,{lineSpacing:1.15});if(i<2)box(s,c.x+286,344,82,2,'#465167',1);});
 notes(s,'The three-part framing interprets the requested theme “attraction, motion, transformation” as the CollabDesk product narrative.');
}
// 4 — concrete demo
{
 const s=pres.slides.add();base(s,4);title(s,'Demo moment','From a messy inbox to a clear counter','Example from the prototype: Café Ramwadi offers ₹8,000 for one reel and two stories.');
 // email source
 box(s,72,300,340,286,C.white,14);pill(s,'INBOUND EMAIL',96,322,143,C.pale,C.ink);
 txt(s,'“We love your Pune food reels.\nOne reel + 2 stories.\nBudget ₹8,000. Post this week.\n30 days of usage.”',96,380,287,124,21,C.ink,true,{lineSpacing:1.12});
 txt(s,'Café Ramwadi',96,535,250,23,14,C.muted,true);
 // middle arrow-like transition
 box(s,440,427,95,4,C.coral,2);circle(s,521,417,24,C.coral);txt(s,'›',521,416,24,24,22,C.white,true,{align:'center'});
 // normalized record
 box(s,564,300,300,286,C.white,14);pill(s,'DEAL CARD',588,322,111,C.green,C.ink);
 txt(s,'Café Ramwadi',588,378,244,31,23,C.ink,true);txt(s,'PAID COLLAB  ·  REEL',588,422,240,22,13,C.muted,true);
 txt(s,'₹8,000 offer',588,472,242,36,25,C.coral,true);txt(s,'Creator reel rate: ₹15,000',588,515,242,24,16,C.ink,false);txt(s,'30-day usage included',588,548,242,22,14,C.muted,false);
 // next arrow
 box(s,882,427,86,4,C.coral,2);circle(s,953,417,24,C.coral);txt(s,'›',953,416,24,24,22,C.white,true,{align:'center'});
 box(s,993,300,215,286,C.ink,14);pill(s,'NEXT STEP',1017,322,98,C.lime,C.ink);
 txt(s,'Counter\nwith context',1017,382,170,76,25,C.white,true,{lineSpacing:0.98});txt(s,'Draft a reply.\nReview and edit.\nCopy when ready.',1017,480,170,76,17,'#C5CBD5',false,{lineSpacing:1.18});
 txt(s,'A useful decision aid—not an auto-send bot.',72,621,850,26,17,C.muted,true);
 notes(s,'Deal example and rate are taken from server/samples.js, server/index.js and server/data/db.json. Quote logic compares this offer with the reel rate; pricing uses the deal format and usage period, not a sum of all deliverables.');
}
// 5 — product capabilities
{
 const s=pres.slides.add();base(s,5);title(s,'What works today','A small prototype with a complete deal loop','The demo follows an inquiry through parsing, pricing, reply drafting and follow-up.');
 const steps=[['01','Capture','Paste an email into the inbox.'],['02','Structure','Extract brand, budget, terms and deadline.'],['03','Decide','Compare offer to the creator’s rate and usage rules.'],['04','Respond','Draft accept, counter, decline or clarification.'],['05','Track','Move the deal through new, negotiating, posted and paid.']];
 steps.forEach((v,i)=>{const y=295+i*65;circle(s,76,y,36,i===2?C.coral:C.ink);txt(s,v[0],76,y+10,36,18,12,C.white,true,{align:'center'});if(i<steps.length-1)box(s,92,y+37,3,29,C.line,1);txt(s,v[1],137,y+2,180,24,17,C.ink,true);txt(s,v[2],340,y+2,780,27,17,C.muted,false);});
 box(s,72,636,1136,2,C.line,1);txt(s,'Content insights and a bounded “Ask your desk” assistant add context to the next decision.',72,651,1060,26,16,C.ink,true);
 notes(s,'Capabilities are documented in README.md and implemented in the React/Vite frontend and Node/Hono API. Email parsing and reply drafting can use a model when configured; deterministic fallback paths are available.');
}
// 6 — architecture/trust boundaries
{
 const s=pres.slides.add();base(s,6,true);title(s,'How it is built','Simple rules for the decision; AI for the busywork','A human stays in control of every business decision and outgoing message.',true);
 // left diagram
 box(s,72,302,635,278,'#202C40',16);
 const blocks=[{x:102,w:150,label:'CREATOR UI',detail:'Inbox · deals · rates',c:C.blue},{x:315,w:150,label:'WORKFLOW API',detail:'Parse · quote · draft',c:C.coral},{x:528,w:150,label:'WORKSPACE',detail:'Demo data · storage',c:C.lime}];
 blocks.forEach(b=>{box(s,b.x,368,b.w,104,C.navy,10);box(s,b.x,368,b.w,7,b.c,4);txt(s,b.label,b.x+14,391,b.w-28,19,12,C.white,true);txt(s,b.detail,b.x+14,422,b.w-28,34,15,'#C5CBD5',false);});
 box(s,253,418,48,3,'#59677C',1);box(s,466,418,48,3,'#59677C',1);
 txt(s,'Optional model assistance',102,505,240,21,14,'#C5CBD5',true);txt(s,'Rate and usage rules stay deterministic.',102,536,525,23,15,C.lime,true);
 // right boundary
 txt(s,'CURRENT BOUNDARIES',756,306,390,22,13,C.lime,true);
 const limits=['No login or multi-creator isolation','No live social account or analytics connection','No automatic email sending or invoicing'];
 limits.forEach((t,i)=>{circle(s,758,354+i*70,12,i===0?C.coral:C.blue);txt(s,t,784,349+i*70,394,47,17,C.white,false,{lineSpacing:1.1});});
 txt(s,'Trust starts with clear limits and creator review.',756,570,420,30,16,'#C5CBD5',true);
 notes(s,'Architecture and product limits are stated in README.md. Data shown in the prototype is seeded fixture data.');
}
// 7 — ask / next step
{
 const s=pres.slides.add();base(s,7);title(s,'Hackathon ask','Help us validate the workflow with real creators','The next milestone is learning whether the desk saves effort and improves deal clarity.');
 box(s,72,302,520,266,C.ink,16);pill(s,'WHAT WE WANT TO LEARN',98,328,212,C.lime,C.ink);
 txt(s,'Can creators act on an offer faster—and feel clearer about the terms?',98,386,447,105,28,C.white,true,{lineSpacing:1.03});
 txt(s,'We want feedback from creators and a few brands on the inbox-to-reply flow.',98,509,443,43,16,'#C5CBD5',false);
 txt(s,'NEXT BUILD',664,311,260,22,13,C.coral,true);
 const next=[['1','Secure creator accounts and private workspaces'],['2','Connect real social metrics with creator permission'],['3','Test rate and usage decisions with pilot users']];
 next.forEach((it,i)=>{const y=362+i*72;circle(s,664,y,32,i===0?C.coral:C.lime);txt(s,it[0],664,y+8,32,16,13,C.ink,true,{align:'center'});txt(s,it[1],714,y-1,450,46,18,C.ink,true,{lineSpacing:1.1});});
 box(s,664,590,544,2,C.line,1);txt(s,'CollabDesk',664,614,210,27,20,C.ink,true);txt(s,'Make the business side easier to manage.',664,646,480,24,16,C.muted,false);
 notes(s,'Next steps are proposed roadmap items, not current capabilities. Ask: feedback and pilot conversations to test the workflow.');
}

const coreSlides=pres.slides.items.slice();
const detailSlides=[];
const proSlides=[];
// Detailed slide — creator profile and deal rules
{
 const s=pres.slides.add();detailSlides.push(s);base(s,8,true);title(s,'Creator profile','Aanya’s workspace gives every deal useful context','The demo is configured for one Pune-based food and city-life creator.',true);
 circle(s,90,307,144,C.coral);txt(s,'AK',90,353,144,45,36,C.white,true,{align:'center'});
 txt(s,'Aanya Kulkarni',272,315,400,42,30,C.white,true);txt(s,'@aanya.eats.pune   ·   Pune',272,365,420,26,17,'#C5CBD5',false);pill(s,'48,000 FOLLOWERS',272,412,187,'#2A3549',C.lime);
 txt(s,'RATE CARD',760,304,310,20,13,C.lime,true);
 const rates=[['REEL','₹15,000',C.coral],['POST','₹8,000',C.blue],['STORIES','₹4,000',C.lime]];
 rates.forEach((r,i)=>{const y=340+i*54;box(s,760,y,412,44,'#202C40',10);box(s,760,y,8,44,r[2],4);txt(s,r[0],784,y+13,155,20,13,'#C5CBD5',true);txt(s,r[1],986,y+8,154,29,20,C.white,true,{align:'right'});});
 box(s,72,528,1096,78,'#202C40',14);txt(s,'CREATOR GUARDRAILS',96,543,214,18,12,C.lime,true);txt(s,'No competing café in the same month  ·  30-day usage included  ·  Longer usage adds 40%',96,571,1024,23,15,C.white,true);
 notes(s,'Creator profile, rates, niche and guardrails come from server/data/db.json. These are seeded demo settings, not a real creator account.');
}
// Detailed slide — quote logic
{
 const s=pres.slides.add();detailSlides.push(s);base(s,9);title(s,'Rate and usage logic','A transparent quote explains why an offer is flagged','The creator’s rate card stays the source of truth; the prototype makes the comparison visible.');
 const checks=[['01','FORMAT RATE','Start with the creator’s rate for the deal format.','REEL  ·  ₹15,000'],['02','USAGE WINDOW','More than 30 days adds 40% to the suggested fee.','31+ DAYS  ·  +40%'],['03','LOWBALL FLAG','Flag an offer below 70% of the suggested fee.','₹15,000 × 70% = ₹10,500']];
 checks.forEach((r,i)=>{const x=72+i*380;box(s,x,306,350,182,i===1?C.soft:C.white,14);circle(s,x+22,328,38,i===1?C.coral:C.ink);txt(s,r[0],x+22,339,38,17,12,C.white,true,{align:'center'});txt(s,r[1],x+75,339,240,19,13,C.muted,true);txt(s,r[2],x+22,390,302,44,18,C.ink,true);pill(s,r[3],x+22,447,Math.min(270,Math.max(170,r[3].length*8)),i===1?C.coral:C.green,i===1?C.white:C.ink);});
 box(s,72,526,1122,73,C.ink,12);txt(s,'EXAMPLE',96,548,100,19,12,C.lime,true);txt(s,'Café Ramwadi’s ₹8,000 offer is below the ₹10,500 flag threshold for a ₹15,000 reel rate.',208,543,948,39,17,C.white,true);
 txt(s,'The quote uses format + usage rules; it does not automatically add every listed deliverable.',72,627,1100,26,15,C.muted,false);
 notes(s,'Pricing logic comes from server/rate.js. The threshold and example are calculated from the demo reel rate (₹15,000 × 0.70 = ₹10,500). The quote function prices the deal format and usage window; it does not sum multi-format deliverables.');
}
// Detailed slide — content signal
{
 const s=pres.slides.add();detailSlides.push(s);base(s,10,true);title(s,'Content context','Use past performance to shape a better-fit brief','Demo post data gives the creator a starting point for partnership conversations.',true);
 txt(s,'AVERAGE REACH IN SEEDED DEMO DATA',72,305,520,22,13,C.lime,true);
 const values=[{label:'FOOD POSTS',v:78,max:100,color:C.coral,detail:'3 posts · 78,000 average reach'},{label:'BEAUTY POST',v:11,max:100,color:C.blue,detail:'1 post · 11,000 reach'}];
 values.forEach((d,i)=>{const y=360+i*108;txt(s,d.label,72,y,220,22,14,C.white,true);box(s,72,y+39,520,20,'#303B4E',10);box(s,72,y+39,520*d.v/d.max,20,d.color,10);txt(s,d.detail,620,y+30,485,30,18,C.white,true);});
 box(s,72,603,1095,50,'#202C40',12);txt(s,'Directional signal only: posts are fixtures in the prototype, not live platform analytics.',94,618,1037,22,15,'#C5CBD5',true);
 notes(s,'Reach values are from server/data/db.json. The mean of the three seeded food posts is 78,000; the single beauty post is 11,000. This is demo fixture data only, not connected social analytics.');
}
// Detailed slide — product surfaces
{
 const s=pres.slides.add();detailSlides.push(s);base(s,11);title(s,'Workspace map','Five views keep the creator’s work in one place','Each view serves one step in the creator-brand collaboration cycle.');
 const tiles=[
  {x:72,y:302,w:348,h:140,n:'01',name:'TODAY',body:'Next actions, deal counts and follow-ups.',c:C.coral},
  {x:446,y:302,w:348,h:140,n:'02',name:'INBOX',body:'Paste a brand email and extract its terms.',c:C.blue},
  {x:820,y:302,w:348,h:140,n:'03',name:'DEALS',body:'Track offers through paid and posted stages.',c:C.lime},
  {x:260,y:476,w:348,h:140,n:'04',name:'CONTENT',body:'Review reach and saves from workspace data.',c:C.lime},
  {x:634,y:476,w:348,h:140,n:'05',name:'MEDIA KIT',body:'Maintain creator niche, audience and rates.',c:C.coral}
 ];
 tiles.forEach(t=>{box(s,t.x,t.y,t.w,t.h,C.white,14);box(s,t.x,t.y,7,t.h,t.c,4);pill(s,t.n,t.x+22,t.y+20,46,t.c,C.ink);txt(s,t.name,t.x+82,t.y+25,t.w-104,19,13,C.muted,true);txt(s,t.body,t.x+22,t.y+71,t.w-44,48,18,C.ink,true,{lineSpacing:1.08});});
 notes(s,'Views and labels correspond to the current application navigation in src/App.jsx. Content and deal values are prototype workspace data.');
}
// Detailed slide — validation plan and close
{
 const s=pres.slides.add();detailSlides.push(s);base(s,12,true);title(s,'What we will validate','A useful desk should make the next decision clearer','We want to test the workflow with creators before expanding integrations.',true);
 const metrics=[['TIME','Email received → reply reviewed'],['QUALITY','Key terms extracted correctly'],['CONFIDENCE','Creator agrees with the rate and usage flag'],['FOLLOW-THROUGH','Next action completed on time']];
 metrics.forEach((m,i)=>{const y=302+i*72;circle(s,76,y,32,i===0?C.coral:i===1?C.blue:C.lime);txt(s,String(i+1),76,y+8,32,16,13,C.ink,true,{align:'center'});txt(s,m[0],126,y+3,170,17,12,i===0?C.lime:'#C5CBD5',true);txt(s,m[1],300,y,690,31,18,C.white,true);});
 box(s,72,603,1096,68,C.coral,14);txt(s,'OUR ASK',96,626,110,20,13,C.white,true);txt(s,'Creator pilot partners + feedback on the inbox-to-reply experience.',220,621,914,31,19,C.white,true);
 notes(s,'These are proposed pilot measures, not measured outcomes. The ask is for creator feedback and pilot conversations.');
}

// 20-slide core story with technical detail and backup material.
{
 const s=pres.slides.add();proSlides.push(s);base(s,13,true);
 txt(s,'THE HOOK',72,82,300,22,13,C.lime,true);
 txt(s,'₹8,000 for a reel?',72,143,730,85,62,C.white,true,{lineSpacing:.96});
 txt(s,'The offer looks simple. The terms around it are not.',76,252,760,41,23,'#C5CBD5',false);
 box(s,875,108,320,332,'#202C40',18);pill(s,'CAFE RAMWADI · DEMO',900,133,192,'#344156',C.white);
 txt(s,'Offer',900,200,100,22,14,'#C5CBD5',true);txt(s,'₹8,000',900,235,250,58,44,C.coral,true);
 txt(s,'Creator reel rate',900,319,220,22,14,'#C5CBD5',true);txt(s,'₹15,000',900,350,230,40,30,C.white,true);
 txt(s,'One email can hide a ₹7,000 gap before you even discuss usage.',72,494,1090,52,25,C.lime,true);
 txt(s,'A concrete demo case from the project fixtures—not a market statistic.',72,563,1000,26,15,'#C5CBD5',false);
 notes(s,'Open with the seeded Café Ramwadi example. The difference is ₹15,000 - ₹8,000 = ₹7,000; this is an illustrative demo offer versus the seeded reel rate, not a claim about creator earnings or market averages.');
}
{
 const s=pres.slides.add();proSlides.push(s);base(s,14);title(s,'The manual gap','Email gives you the conversation, but not the whole workflow','CollabDesk organizes the details that the creator must evaluate and track.');
 box(s,72,310,496,276,'#E9E6DF',16);pill(s,'EMAIL-ONLY FLOW',96,334,158,C.white,C.ink);
 const left=['Re-read the thread to find terms','Recall the right rate and usage rule','Draft each response from scratch','Remember which deal needs follow-up'];
 left.forEach((x,i)=>{circle(s,99,390+i*44,10,C.muted);txt(s,x,122,384+i*44,407,28,16,C.ink,false);});
 box(s,705,310,503,276,C.ink,16);pill(s,'COLLABDESK PROTOTYPE',729,334,198,C.lime,C.ink);
 const right=['Extract a structured deal record','Compare offer with saved rate rules','Draft a reply for creator review','Keep basic deal stages and next actions visible'];
 right.forEach((x,i)=>{circle(s,733,390+i*44,10,i===1?C.coral:C.lime);txt(s,x,756,384+i*44,416,28,16,C.white,false);});
 txt(s,'Workflow comparison only. This is not a competitor study or measured time-saving claim.',72,617,1120,28,15,C.muted,true);
 notes(s,'The left column describes a plausible email-only manual workflow; it is a design comparison, not a researched competitive claim. The right column maps to actual prototype routes and features.');
}
{
 const s=pres.slides.add();proSlides.push(s);base(s,15,true);title(s,'AI and automation','AI reads and drafts; code controls the fee','Optional model calls never decide or change the creator’s rates.',true);
 // two parallel lanes
 const lanes=[
  {x:72,label:'INBOX EXTRACTION',prompt:'Email text',out:'Validated deal fields',col:C.coral},
  {x:72,label:'REPLY DRAFT',prompt:'Intent + deal + fixed quote',out:'Subject + reply body',col:C.blue}
 ];
 lanes.forEach((l,i)=>{const y=304+i*139;txt(s,l.label,72,y,280,21,13,l.col,true);box(s,72,y+34,231,68,'#202C40',10);txt(s,l.prompt,88,y+56,195,28,15,C.white,true);box(s,331,y+66,74,3,'#556176',1);box(s,434,y+34,222,68,'#202C40',10);txt(s,'OpenAI optional',450,y+45,185,20,13,C.lime,true);txt(s,'gpt-4o-mini',450,y+68,185,22,14,C.white,false);box(s,684,y+66,74,3,'#556176',1);box(s,789,y+34,257,68,'#202C40',10);txt(s,l.out,805,y+54,224,34,15,C.white,true);box(s,1080,y+66,72,3,l.col,2);circle(s,1144,y+55,24,l.col);});
 txt(s,'VALIDATION + FALLBACK',72,580,230,20,12,C.lime,true);txt(s,'Model JSON is checked. Missing key, timeout, provider error or invalid output falls back to deterministic code.',72,610,1108,38,16,C.white,true);
 txt(s,'Rate quote remains deterministic in server/rate.js.',72,663,870,21,14,'#C5CBD5',false);
 notes(s,'server/llm.js uses OpenAI Chat Completions with gpt-4o-mini and a 10-second timeout. server/prompts.js sets the extraction and response constraints. server/index.js validates fields and falls back. Inbox email text is sent to OpenAI only when configured; the assistant sends the question and a bounded workspace summary. No AI provider is configured during this review.');
}
{
 const s=pres.slides.add();proSlides.push(s);base(s,16);title(s,'State and storage','A small state document keeps the prototype clear','The schema fits one demo creator today; multi-creator ownership needs a redesign.');
 const entities=[{x:72,w:285,name:'creator',fields:'profile · niche\nfollowers · rates',c:C.coral},{x:410,w:285,name:'deals[]',fields:'brand · offer · terms\nstatus · usage',c:C.blue},{x:748,w:285,name:'posts[]',fields:'topic · reach\nsaves · format',c:C.lime}];
 entities.forEach(e=>{box(s,e.x,326,e.w,148,C.white,14);box(s,e.x,326,e.w,8,e.c,4);txt(s,e.name,e.x+20,354,e.w-40,30,22,C.ink,true);txt(s,e.fields,e.x+20,398,e.w-40,55,16,C.muted,false,{lineSpacing:1.2});});
 box(s,72,520,474,75,C.ink,12);txt(s,'DEFAULT',94,538,100,16,12,C.lime,true);txt(s,'server/data/db.json',94,562,410,21,17,C.white,true);
 box(s,576,520,592,75,'#E4E8F2',12);txt(s,'OPTIONAL',600,538,100,16,12,C.coral,true);txt(s,'Supabase · one collabdesk_state JSONB row',600,562,530,21,17,C.ink,true);
 txt(s,'Quotes and reach averages are computed when requested; no normalized tables or foreign keys exist.',72,623,1110,26,15,C.muted,true);
 notes(s,'Data model is `creator`, `deals[]`, `posts[]` in server/data/db.json. Optional Supabase stores the whole state in a singleton JSONB row; see the migration. This is not relational, normalized or multi-tenant.');
}
{
 const s=pres.slides.add();proSlides.push(s);base(s,17,true);title(s,'Engineering choices','Small safeguards make a local demo more reliable','They improve bounded input handling and writes; they do not replace identity or access control.',true);
 const choices=[
  ['BOUNDED REQUESTS','16 KB API body cap · email up to 10,000 characters · field validation'],
  ['RELIABLE FILE WRITES','In-process update queue · temp write + atomic rename'],
  ['OPTIONAL DATABASE','Supabase compare-and-swap revision check · retries up to five times'],
  ['LOCAL-ONLY DEFAULT','Bind to 127.0.0.1 · exact-origin CORS allowlist']
 ];
 choices.forEach((item,i)=>{const x=72+(i%2)*560,y=302+Math.floor(i/2)*144;box(s,x,y,514,116,'#202C40',13);box(s,x,y,8,116,[C.coral,C.blue,C.lime,C.coral][i],4);txt(s,item[0],x+24,y+20,450,18,12,[C.coral,C.blue,C.lime,C.coral][i],true);txt(s,item[1],x+24,y+51,450,48,16,C.white,true,{lineSpacing:1.12});});
 txt(s,'No authentication, authorization or per-user boundaries exist. Do not expose this API to a shared network.',72,626,1120,34,16,C.lime,true);
 notes(s,'Backend choices verified in server/index.js, server/store.js, server/supabase-store.js, and supabase/migrations/202610230001_collabdesk_state.sql. CORS and loopback binding are defense-in-depth for local development, not authentication.');
}
{
 const s=pres.slides.add();proSlides.push(s);base(s,18);title(s,'Evidence today','The API suite passes; user impact is still a hypothesis','Verification covers backend behavior and a production frontend build, not a browser journey.');
 box(s,72,312,315,244,C.ink,15);txt(s,'10 / 10',100,354,260,62,48,C.lime,true);txt(s,'automated tests pass',100,423,250,26,18,C.white,true);txt(s,'API · validation · fallback · rate logic · mocked Supabase',100,470,250,54,15,'#C5CBD5',false,{lineSpacing:1.15});
 box(s,420,312,315,244,C.white,15);txt(s,'BUILD',448,355,250,18,12,C.coral,true);txt(s,'Vite production\nbuild passes',448,394,252,69,27,C.ink,true,{lineSpacing:1.02});txt(s,'Frontend assets compile successfully.',448,490,245,36,15,C.muted,false);
 box(s,768,312,440,244,C.soft,15);txt(s,'NOT VERIFIED',796,355,300,18,12,C.coral,true);txt(s,'No live OpenAI\nor Supabase check',796,394,350,68,25,C.ink,true,{lineSpacing:1.02});txt(s,'No automated browser, accessibility, responsive or user study results.',796,487,360,52,15,C.ink,false,{lineSpacing:1.15});
 txt(s,'No time-saved, revenue or adoption claims are available yet.',72,608,1100,30,18,C.ink,true);
 notes(s,'At time of generation, npm test returned 10 passed, 0 failed; npm run build passed with Vite 6.4.5. The backend suite does not verify the browser UI. No external model or live Supabase credentials were used.');
}
{
 const s=pres.slides.add();proSlides.push(s);base(s,19,true);title(s,'API backup','Twelve endpoint actions support the current workspace','The Vercel-style adapters are present; a deployed endpoint was not verified.',true);
 const groups=[
  {x:72,label:'PROFILE + DEALS',items:['GET /api/creator','PUT /api/creator','GET /api/deals','GET /api/deals/:id','PATCH /api/deals/:id'],c:C.coral},
  {x:468,label:'INBOX + REPLIES',items:['GET /api/samples','POST /api/inbox/parse','POST /api/deals/:id/rate','POST /api/deals/:id/reply'],c:C.blue},
  {x:864,label:'INSIGHTS + ASSISTANT',items:['GET /api/content','GET /api/today','POST /api/assistant'],c:C.lime}
 ];
 groups.forEach(g=>{txt(s,g.label,g.x,306,330,20,12,g.c,true);g.items.forEach((it,i)=>txt(s,it,g.x,343+i*45,336,24,15,C.white,true));});
 box(s,72,584,1104,64,'#202C40',11);txt(s,'All API routes are shared single-user demo routes. No auth middleware or owner scoping.',94,605,1057,25,15,'#C5CBD5',true);
 notes(s,'Route inventory is from server/index.js and docs/architecture/api-flow.md. A Vercel-style handler adapter lives in api/, but deployment is not verified.');
}
{
 const s=pres.slides.add();proSlides.push(s);base(s,20);title(s,'Code map backup','Find implementation fast during judge Q&A','The active React/API workflow is separate from an unused TypeScript engine module.');
 const rows=[
  ['UI + browser API','src/App.jsx · src/api.js · src/main.jsx'],
  ['API routes + validation','server/index.js · server/prompts.js · server/rate.js'],
  ['Persistence','server/store.js · server/supabase-store.js · supabase/migrations/'],
  ['Fixtures + checks','server/data/db.json · server/samples.js · test/'],
  ['Prototype logic','src/lib/collab/engine.ts and types.ts are not imported by the active UI']
 ];
 rows.forEach((r,i)=>{const y=304+i*66;box(s,72,y,1120,54,i===4?C.soft:C.white,10);txt(s,r[0],92,y+17,255,20,14,i===4?C.coral:C.muted,true);txt(s,r[1],360,y+15,805,24,16,C.ink,true);});
 txt(s,'A live feature is one connected through the current frontend/API path—not merely a definition in an unused file.',72,651,1120,24,14,C.muted,true);
 notes(s,'Source paths and imports were checked. src/lib/collab/engine.ts defines separate parse/quote/draft/insight/fit-score helpers, but the current React app imports src/api.js and the backend; the TypeScript engine is not wired into the active UI and should not be presented as a live feature.');
}

const slideIndex=await pres.inspect({kind:'slide',maxChars:30000});
const ids=slideIndex.records.map(r=>r.id);
pres.slides.reorder([ids[0],ids[12],ids[1],ids[7],ids[13],ids[2],ids[10],ids[4],ids[3],ids[8],ids[14],ids[9],ids[5],ids[15],ids[16],ids[17],ids[6],ids[11],ids[18],ids[19]]);
for(let i=1;i<pres.slides.items.length;i++){
 const marker=pres.slides.items[i].shapes.items.find(x=>x.name==='slide-number');
 if(marker) marker.text=String(i+1).padStart(2,'0');
}

const buildDir=path.resolve('/Users/ravirajbhope/CreatorProduction/.hackathon_build');
const previewDir=path.join(buildDir,'previews');
await fs.mkdir(previewDir,{recursive:true});
const deliverableDir='/Users/ravirajbhope/CreatorProduction/hackathon-presentation';
await fs.mkdir(deliverableDir,{recursive:true});
for(let i=0;i<pres.slides.items.length;i++){
 const blob=await pres.export({slide:pres.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(previewDir,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const skillDir='/Users/ravirajbhope/.codex/plugins/cache/openai-primary-runtime/presentations/26.1022.11436/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(path.join(skillDir,'container_tools/artifact_tool_utils.mjs')).href);
const candidatePath=path.join(buildDir,'candidate.pptx');
await (await PresentationFile.exportPptx(pres)).save(candidatePath);
const finalPath=path.join(deliverableDir,'Project_Hackathon_Pitch.pptx');
const result=await finalizePresentation({
 workspaceDir:'/Users/ravirajbhope/CreatorProduction',candidatePath,finalPath,
 pythonExecutable:'/Users/ravirajbhope/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
 integrityValidatorPath:path.join(skillDir,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skillDir,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 requiredNativeTableOwnerSlides:[],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,
 receiptPath:path.join(buildDir,'validation-masterprompt.json'),
});
console.log(JSON.stringify({finalPath,slides:pres.slides.items.length,result},null,2));
