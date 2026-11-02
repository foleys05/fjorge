
/* FJORGE Training Intelligence v2: additive features, no data migrations. */
(()=>{
'use strict';
const $id=id=>document.getElementById(id);
const esc=escapeHTML;
const pById=id=>PLAN.find(p=>p.id===id);
const validSets=e=>(e.sets||[]).filter(x=>x.reps!==''&&x.reps!=null&&Number(x.reps)>0);
const sessions=()=>[...state.sessions].filter(s=>s&&typeof s.date==='string').sort((a,b)=>a.date.localeCompare(b.date));
const weightMode=p=>p&&['load','added'].includes(p.mode);
const n=x=>Number(x)||0;
let chartMetric='est1RM', chartExercise=PLAN[0].id, reportMonth=today().slice(0,7), timerAuto=true, autoRestDebounce=null;
const svgLine=(points,metric)=>{
 if(!points.length)return '<p class="muted">Log this exercise to see a trend.</p>';
 const w=720,h=210,pad=38,vals=points.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),spread=Math.max(1,max-min),y=v=>h-pad-(v-min)/spread*(h-2*pad),x=i=>pad+i/Math.max(1,points.length-1)*(w-2*pad);
 const coords=points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ');
 return `<svg class="ti-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(metric)} over ${points.length} workouts" preserveAspectRatio="xMidYMid meet">
 <line x1="${pad}" x2="${w-pad}" y1="${h-pad}" y2="${h-pad}" stroke="#45634d"/>
 <line x1="${pad}" x2="${w-pad}" y1="${pad}" y2="${pad}" stroke="#33483b" stroke-dasharray="4 5"/>
 <polyline points="${coords}" fill="none" stroke="#d2ee90" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
 ${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="#d2ee90"><title>${esc(p.date)}: ${Math.round(p.value*10)/10}</title></circle>`).join('')}
 <text x="${pad}" y="20" fill="#b9c9bd" font-size="13">${(max).toFixed(1)}</text>
 <text x="${pad}" y="${h-8}" fill="#b9c9bd" font-size="13">${esc(points[0].date)}</text>
 <text x="${w-pad}" y="${h-8}" fill="#b9c9bd" font-size="13" text-anchor="end">${esc(points[points.length-1].date)}</text></svg>`;
};
function series(id,metric){
 return sessions().flatMap(s=>(s.exercises||[]).filter(e=>e.id===id).map(e=>{
  const sets=validSets(e),p=pById(id);
  const w=sets.filter(x=>n(x.weight)>0);
  const values={
   est1RM:Math.max(0,...w.filter(x=>n(x.reps)<=12).map(x=>n(x.weight)*(1+n(x.reps)/30))),
   weight:Math.max(0,...w.map(x=>n(x.weight))),
   reps:Math.max(0,...sets.map(x=>n(x.reps))),
   volume:weightMode(p)?sets.reduce((t,x)=>t+n(x.weight)*n(x.reps),0):0
  };
  return {date:s.date,value:values[metric]};
 })).filter(x=>x.value>0);
}
function strengthDashboard(){
 const p=pById(chartExercise)||PLAN[0];
 const points=series(p.id,chartMetric),latest=points.at(-1),first=points[0],delta=latest&&first&&points.length>1?latest.value-first.value:null;
 const options=[['est1RM','Estimated 1RM'],['weight','Top working weight'],['reps','Best reps'],['volume','Session volume']];
 return `<div class="line"><div><span class="pill">Training intelligence</span><h1>Strength dashboard</h1><p class="muted">Progress across saved workouts, including corrected history.</p></div><button onclick="go('insights')">All insights</button></div>
 <div class="card"><div class="feature-controls">
 <label>Exercise<select onchange="fjorgeTI.exercise(this.value)">${PLAN.map(q=>`<option value="${esc(q.id)}" ${q.id===p.id?'selected':''}>${esc(q.day+' · '+q.name)}</option>`).join('')}</select></label>
 <label>Metric<select onchange="fjorgeTI.metric(this.value)">${options.map(([id,label])=>`<option value="${id}" ${id===chartMetric?'selected':''}>${label}</option>`).join('')}</select></label>
 </div><div class="feature-grid"><div class="metric"><small>Latest</small><strong>${latest?Math.round(latest.value*10)/10:'—'}</strong></div><div class="metric"><small>Change since first</small><strong>${delta===null?'—':(delta>0?'+':'')+Math.round(delta*10)/10}</strong></div><div class="metric"><small>Logged performances</small><strong>${points.length}</strong></div></div>
 ${svgLine(points,options.find(o=>o[0]===chartMetric)?.[1]||chartMetric)}
 <p class="small-print">Estimated 1RM uses the Epley equation for sets of 12 reps or fewer. Values are estimates, not tested maximums. A different exercise or technique can change comparability.</p></div>
 <div class="card"><h2>Recent performances</h2>${points.slice(-8).reverse().map(x=>`<div class="line ti-history-line"><span>${esc(x.date)}</span><strong>${(Math.round(x.value*10)/10).toLocaleString()} ${chartMetric==='reps'?'reps':'lb'}</strong></div>`).join('')||'<p class="muted">No performances yet.</p>'}</div>`;
}
function loadTargets(){
 const draft=state.draft;if(!draft)return '';
 return `<div class="card"><h2>Progressive overload targets</h2><p class="muted small">Conservative suggestions from your last completed performance. Prioritize technique and recovery.</p>${draft.exercises.map(e=>{
  const p=pById(e.id),prev=previous(e.id,draft.id);
  if(!p)return '';
  if(draft.trainingMode==='hotel_deload')return `<div class="ti-guidance"><strong>${esc(p.name)}</strong><span>Deload: keep 3–4 reps in reserve and reduce fatigue.</span></div>`;
  if(!prev)return `<div class="ti-guidance"><strong>${esc(p.name)}</strong><span>No prior workout. Start with a manageable load.</span></div>`;
  const sets=validSets(prev),w=sets.filter(s=>n(s.weight)>0);
  let suggestion='';
  if(p.mode==='time')suggestion='Match your previous holds; increase seconds gradually with good form.';
  else if(p.mode==='control')suggestion='Match reps with control; progress only when technique is consistent.';
  else if(p.mode==='band')suggestion='Keep band assistance the same until all sets reach the top of the rep range.';
  else if(!w.length)suggestion='Record your working weight to unlock a load target.';
  else{
   const top=Math.max(...w.map(s=>n(s.weight))),maxRep=p.max||12,step=n(p.step);
   const rir=prev.rir===''||prev.rir==null?null:Number(prev.rir);
   if(sets.length>=p.sets&&sets.every(s=>n(s.reps)>=maxRep)&&step>0&&rir!==0)
     suggestion=`Consider ${top+step} lb (+${step}) if technique and recovery are solid.`;
   else if(sets.some(s=>n(s.reps)<n(p.min)))
     suggestion=`Repeat or slightly reduce ${top} lb until you reach the prescribed rep range.`;
   else suggestion=`Repeat approximately ${top} lb and build reps before adding weight.`;
  }
  return `<div class="ti-guidance"><strong>${esc(p.name)}</strong><span>${esc(suggestion)}</span></div>`;
 }).join('')}</div>`;
}
function muscleVolume(){
 const totals=volumeInsights(),names=['Chest','Back','Shoulders','Triceps','Biceps','Quads','Hamstrings','Glutes','Calves','Core'];
 const max=Math.max(1,...Object.values(totals));
 return `<div class="card"><div class="line"><h2>Weekly muscle-group sets</h2><span class="pill">Mon–today</span></div>
 <p class="muted small">Completed sets count toward each mapped muscle. Compounds overlap; these are exposure counts, not isolated hard sets.</p>
 ${names.map(m=>`<div class="ti-volume"><div class="line"><b>${m}</b><span>${totals[m]||0} sets</span></div><div class="mini-bar"><span style="width:${(totals[m]||0)/max*100}%"></span></div></div>`).join('')}</div>`;
}
function recoveryAdvisor(){
 const w=[...state.wellness].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
 const avg=(k)=>w.length?w.reduce((t,x)=>t+n(x[k]),0)/w.length:null;
 const energy=avg('energy'),soreness=avg('soreness');
 const last14=sessions().filter(s=>s.date>=new Date(Date.now()-14*864e5).toLocaleDateString('en-CA'));
 const deloads=last14.filter(s=>s.trainingMode==='hotel_deload').length;
 let msg='Log a few recovery check-ins to establish your recent pattern.';
 if(w.length>=3){
  if(energy<=2.5&&soreness>=3.5)msg='Recent check-ins show low energy and elevated soreness. Consider reducing training stress and prioritizing recovery; a deload may be useful if performance also drops.';
  else if(energy<=2.5||soreness>=4)msg='Some fatigue signals are elevated. Monitor performance and adjust effort if recovery stays poor.';
  else msg='Recent check-ins do not show a strong fatigue pattern. Keep monitoring alongside training performance.';
 }else if(w.length)msg='Add at least three check-ins for a more useful trend.';
 return `<div class="card"><h2>Recovery & deload advisor</h2>
 <div class="feature-grid"><div class="metric"><small>Recent energy</small><strong>${energy===null?'—':energy.toFixed(1)+'/5'}</strong></div><div class="metric"><small>Recent soreness</small><strong>${soreness===null?'—':soreness.toFixed(1)+'/5'}</strong></div><div class="metric"><small>Deload sessions (14d)</small><strong>${deloads}</strong></div></div>
 <div class="feature-note">${esc(msg)}</div>
 <p class="small-print">Based on your latest seven recovery check-ins, not a medical assessment. Deloads are optional; one poor workout alone isn't a reason to change the plan.</p></div>`;
}
function monthSessions(){return sessions().filter(s=>s.date.slice(0,7)===reportMonth)}
function monthlyReportData(){
 const a=monthSessions(),sets=a.reduce((t,s)=>t+completed(s),0),vol=a.reduce((t,s)=>t+volume(s),0),cardio=(state.cardioLogs||[]).filter(c=>String(c.date).slice(0,7)===reportMonth);
 const minutes=cardio.reduce((t,c)=>t+n(c.minutes),0),prs=[];
 const before=sessions().filter(s=>s.date.slice(0,7)<reportMonth);
 for(const p of PLAN){
  const old=before.flatMap(s=>(s.exercises||[]).filter(e=>e.id===p.id).flatMap(e=>validSets(e).map(x=>n(x.weight)))).filter(x=>x>0);
  const current=a.flatMap(s=>(s.exercises||[]).filter(e=>e.id===p.id).flatMap(e=>validSets(e).map(x=>n(x.weight)))).filter(x=>x>0);
  if(current.length&&Math.max(...current)>Math.max(0,...old))prs.push({name:p.name,weight:Math.max(...current)});
 }
 return {a,sets,vol,cardio,minutes,prs};
}
function monthlyReport(){
 const r=monthlyReportData();
 return `<div class="line"><div><span class="pill">Training review</span><h1>Monthly report</h1></div><button onclick="go('strength-dashboard')">Strength dashboard</button></div>
 <div class="card"><div class="feature-controls"><label>Report month<input type="month" value="${esc(reportMonth)}" onchange="fjorgeTI.month(this.value)"></label><button class="primary" onclick="fjorgeTI.exportReport()">Export CSV</button></div>
 <div class="feature-grid"><div class="metric"><small>Strength sessions</small><strong>${r.a.length}</strong></div><div class="metric"><small>Completed sets</small><strong>${r.sets}</strong></div><div class="metric"><small>Strength volume</small><strong>${fmt(r.vol)} lb</strong></div><div class="metric"><small>Cardio minutes</small><strong>${r.minutes}</strong></div><div class="metric"><small>Cardio activities</small><strong>${r.cardio.length}</strong></div><div class="metric"><small>New weight highs*</small><strong>${r.prs.length}</strong></div></div>
 <p class="small-print">*Weight highs compare the selected month with earlier logged months. A lift with no earlier history counts as a first recorded high. Exercise setup should remain consistent.</p></div>
 <div class="card"><h2>Weight highs this month</h2>${r.prs.map(p=>`<div class="line ti-history-line"><span>${esc(p.name)}</span><strong>${p.weight} lb</strong></div>`).join('')||'<p class="muted">No new logged weight highs this month.</p>'}</div>
 <div class="card"><h2>Completed sessions</h2>${r.a.slice().reverse().map(s=>`<div class="line ti-history-line"><span>${esc(s.date)} · ${esc(s.day)}</span><strong>${completed(s)} sets</strong></div>`).join('')||'<p class="muted">No strength sessions this month.</p>'}</div>`;
}
function exportReport(){
 const r=monthlyReportData();
 const rows=[['month','strength_sessions','completed_sets','strength_volume_lb','cardio_minutes','cardio_activities','new_weight_highs'],[reportMonth,r.a.length,r.sets,r.vol,r.minutes,r.cardio.length,r.prs.length],[],['date','day','sets','volume_lb']];
 r.a.forEach(s=>rows.push([s.date,s.day,completed(s),volume(s)]));
 rows.push([],['exercise','highest_weight_lb']);r.prs.forEach(p=>rows.push([p.name,p.weight]));
 download('fjorge-report-'+reportMonth+'.csv',rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
const oldHome=home;
home=function(){
 return oldHome()+`<div class="card ti-highlight"><span class="pill">FJORGE Intelligence</span><h2>See the progress. Plan the next rep.</h2><p class="muted">Strength trends, progressive overload, muscle volume, recovery and monthly reviews.</p><div class="row"><button class="primary" onclick="go('strength-dashboard')">Strength dashboard</button><button onclick="go('monthly-report')">Monthly report</button><button onclick="go('insights')">Recovery & volume</button></div></div>`;
};
const oldLog=log;
log=function(){
 const html=oldLog();
 if(!state.draft)return html;
 return html.replace('<div class="card row">',loadTargets()+'<div class="card row">');
};
const oldInsights=insights;
insights=function(){
 return `<div class="row" style="margin-bottom:16px"><button onclick="go('strength-dashboard')">Strength dashboard</button><button onclick="go('monthly-report')">Monthly report</button></div>`+recoveryAdvisor()+muscleVolume()+`<details class="card"><summary><b>Recovery check-in & additional insights</b></summary>${oldInsights()}</details>`;
};
const oldRender=render;
render=function(){
 if(view==='strength-dashboard'||view==='monthly-report'){
  $id('app').innerHTML=view==='strength-dashboard'?strengthDashboard():monthlyReport();return;
 }
 oldRender();
};
const oldUpdateSet=updateSet;
updateSet=function(i,j,k,v){
 const before=state.draft?.exercises?.[i]?.sets?.[j]?.reps;
 oldUpdateSet(i,j,k,v);
 if(k==='reps'&&v!==''&&n(v)>0&&(before===''||before==null)&&timerAuto){
  const p=pById(state.draft?.exercises?.[i]?.id);
  const seconds=(p?.mode==='load'&&p?.min<=8)?180:90;
  const selector=$id('rest-seconds');if(selector){
   if(![...selector.options].some(o=>Number(o.value)===seconds)){const o=document.createElement('option');o.value=String(seconds);o.textContent=seconds+' seconds';selector.add(o);}
   selector.value=String(seconds);
   clearTimeout(autoRestDebounce);autoRestDebounce=setTimeout(()=>{if(timerAuto&&view==='log')restStart()},1000);
  }
 }
};
const oldRestWidget=restWidget;
restWidget=function(){
 return oldRestWidget().replace('</div><p class="small-print">',`</div><label class="ti-autorest"><input type="checkbox" ${timerAuto?'checked':''} onchange="fjorgeTI.autoRest(this.checked)"> Auto-start when a set's reps are logged (3 min heavy compounds; 90 sec others)</label><p class="small-print">`);
};
window.fjorgeTI={
 exercise:v=>{chartExercise=v;render()},
 metric:v=>{chartMetric=v;render()},
 month:v=>{if(/^\d{4}-\d{2}$/.test(v)){reportMonth=v;render()}},
 exportReport,autoRest:v=>{timerAuto=!!v}
};
})();
