
/* FJORGE editable history — existing record IDs retained for cloud synchronization. */
(()=>{
'use strict';
let editing=null, editingCardio=null;
const clone=x=>structuredClone(x);
const opt=(v,label,selected)=>`<option value="${escapeHTML(v)}" ${v===selected?'selected':''}>${escapeHTML(label)}</option>`;
const button=`<button class="primary" onclick="fjorgeEdit.save()">Save changes</button>`;
function start(id){
 const found=state.sessions.find(s=>s.id===id);if(!found)return;
 editing=clone(found);editingCardio=null;view='edit-workout';render();window.scrollTo(0,0);
}
function set(k,v){if(editing)editing[k]=v;}
function setExercise(i,k,v){if(editing?.exercises[i])editing.exercises[i][k]=v;}
function setSet(i,j,k,v){if(editing?.exercises[i]?.sets[j])editing.exercises[i].sets[j][k]=v;}
function addSet(i){editing.exercises[i].sets.push({weight:'',reps:''});render();}
function removeSet(i,j){editing.exercises[i].sets.splice(j,1);render();}
function addExercise(){
 const id=document.getElementById('edit-add-exercise')?.value;
 const p=PLAN.find(p=>p.id===id);
 if(!p)return;
 editing.exercises.push({id,notes:'',rir:'',sets:[{weight:'',reps:''}]});render();
}
function removeExercise(i){if(confirm('Remove this exercise from this workout?')){editing.exercises.splice(i,1);render();}}
function validNumber(x,min,max){return x===''||x==null||(Number.isFinite(Number(x))&&Number(x)>=min&&Number(x)<=max)}
function saveEdit(){
 if(!editing)return;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(editing.date)||!Number.isFinite(Date.parse(editing.date+'T12:00:00')))return alert('Enter a valid workout date.');
 if(!validNumber(editing.bw,1,1500)||!validNumber(editing.durationMinutes,1,1440))return alert('Check bodyweight and workout duration.');
 for(const e of editing.exercises)for(const s of e.sets){
   if(!validNumber(s.weight,0,5000)||!validNumber(s.reps,0,10000))return alert('Check the weights and reps/seconds.');
 }
 if(!editing.exercises.some(e=>e.sets.some(s=>s.reps!==''&&s.reps!=null)))return alert('Log at least one set before saving.');
 const index=state.sessions.findIndex(s=>s.id===editing.id);if(index<0)return alert('Workout no longer exists.');
 state.sessions[index]=clone(editing);editing=null;save();toast('Workout updated');go('history');
}
function cancel(){editing=null;editingCardio=null;go('history');}
function editor(){
 if(!editing)return history();
 const s=editing;
 return `<div class="line"><div><h1>Edit workout</h1><p class="muted">Correct the saved session. Its original ID stays the same.</p></div><button onclick="fjorgeEdit.cancel()">Cancel</button></div>
 <div class="card"><div class="feature-controls">
 <label>Workout day<select onchange="fjorgeEdit.set('day',this.value)">${[...new Set([...DAYS,s.day])].map(d=>opt(d,d,s.day)).join('')}</select></label>
 <label>Date<input type="date" value="${escapeHTML(s.date)}" onchange="fjorgeEdit.set('date',this.value)"></label>
 <label>Bodyweight (lb)<input type="number" min="1" max="1500" step=".1" value="${escapeHTML(s.bw??'')}" oninput="fjorgeEdit.set('bw',this.value)"></label>
 <label>Duration (min)<input type="number" min="1" max="1440" step="1" value="${escapeHTML(s.durationMinutes??'')}" oninput="fjorgeEdit.set('durationMinutes',this.value)"></label>
 <label>Intensity<select onchange="fjorgeEdit.set('intensityMet',this.value)">${opt('3.5','Moderate · 3.5 MET',String(s.intensityMet||'3.5'))}${opt('6','Vigorous · 6 MET',String(s.intensityMet||'3.5'))}</select></label>
 </div><label>Workout notes<textarea rows="3" oninput="fjorgeEdit.set('notes',this.value)">${escapeHTML(s.notes||'')}</textarea></label></div>
 ${s.exercises.map((e,i)=>{const p=PLAN.find(p=>p.id===e.id),mode=p?.mode||'load';return `<section class="card">
 <div class="line"><h2>${escapeHTML(p?.name||e.id)}</h2><button class="danger" onclick="fjorgeEdit.removeExercise(${i})">Remove exercise</button></div>
 <div class="sets">${e.sets.map((x,j)=>`<div class="set"><b>Set ${j+1}</b>
 ${!['band','control','time'].includes(mode)?`<label>Weight (lb)<input type="number" step=".5" min="0" value="${escapeHTML(x.weight??'')}" oninput="fjorgeEdit.setSet(${i},${j},'weight',this.value)"></label>`:''}
 <label>${mode==='time'?'Seconds':'Reps'}<input type="number" min="0" value="${escapeHTML(x.reps??'')}" oninput="fjorgeEdit.setSet(${i},${j},'reps',this.value)"></label>
 <button onclick="fjorgeEdit.removeSet(${i},${j})" aria-label="Remove set ${j+1}">Remove</button></div>`).join('')}</div>
 <button onclick="fjorgeEdit.addSet(${i})">+ Add set</button>
 <div class="row" style="margin-top:12px"><label>RIR<input type="number" min="0" max="10" value="${escapeHTML(e.rir??'')}" oninput="fjorgeEdit.setExercise(${i},'rir',this.value)"></label><label style="flex:1">Exercise notes<input style="width:100%" value="${escapeHTML(e.notes||'')}" oninput="fjorgeEdit.setExercise(${i},'notes',this.value)"></label></div>
 </section>`}).join('')}
 <div class="card"><h2>Add exercise</h2><div class="row"><select id="edit-add-exercise" aria-label="Exercise to add">${PLAN.map(p=>opt(p.id,p.day+' · '+p.name,'')).join('')}</select><button onclick="fjorgeEdit.addExercise()">+ Add exercise</button></div></div>
 <div class="card"><div class="row">${button}<button onclick="fjorgeEdit.cancel()">Cancel</button></div><p class="muted small">Saving updates the original record and recalculates progress, PRs, volume and calorie totals. Cloud sync follows the usual status.</p></div>`;
}
const oldHistory=history;
history=function(){
 return oldHistory().replace(/<button onclick="openSession\('([^']+)'\)">Details<\/button>/g,
 (_,id)=>`<button onclick="openSession('${id}')">Details</button><button onclick="fjorgeEdit.start('${id}')">Edit</button>`);
};
const oldOpen=openSession;
openSession=function(id){
 oldOpen(id);
 const root=document.getElementById('app');
 if(root&&view==='detail')root.innerHTML=root.innerHTML.replace('</button><h1>',`</button><button onclick="fjorgeEdit.start('${id}')">Edit workout</button><h1>`);
};
const oldRender=render;
render=function(){
 if(view==='edit-workout'){$('app').innerHTML=editor();return}
 if(view==='edit-cardio'){$('app').innerHTML=cardioEditor();return}
 oldRender();
};
function startCardio(id){
 const c=state.cardioLogs.find(c=>c.id===id);if(!c)return;
 editingCardio=clone(c);editing=null;view='edit-cardio';render();window.scrollTo(0,0);
}
function cardioSet(k,v){if(editingCardio)editingCardio[k]=v;}
function cardioEditor(){
 const c=editingCardio;if(!c)return cardio();
 return `<h1>Edit cardio activity</h1><div class="card"><div class="activity-form">
 <label>Activity<select onchange="fjorgeEdit.cardioSet('kind',this.value)">${Object.entries(CARDIO_LABEL).map(([k,v])=>opt(k,v,c.kind)).join('')}</select></label>
 <label>Date<input type="date" value="${escapeHTML(c.date)}" onchange="fjorgeEdit.cardioSet('date',this.value)"></label>
 <label>Duration (minutes)<input type="number" min="1" max="1440" value="${escapeHTML(c.minutes)}" oninput="fjorgeEdit.cardioSet('minutes',this.value)"></label>
 <label>Distance (miles)<input type="number" min="0" step=".01" value="${escapeHTML(c.distance??'')}" oninput="fjorgeEdit.cardioSet('distance',this.value)"></label>
 <label>Bodyweight (lb)<input type="number" min="1" step=".1" value="${escapeHTML(c.weight??'')}" oninput="fjorgeEdit.cardioSet('weight',this.value)"></label></div>
 <label>Notes<textarea rows="3" oninput="fjorgeEdit.cardioSet('notes',this.value)">${escapeHTML(c.notes||'')}</textarea></label>
 <div class="row" style="margin-top:16px"><button class="primary" onclick="fjorgeEdit.saveCardio()">Save changes</button><button onclick="fjorgeEdit.cancel()">Cancel</button></div></div>`;
}
function saveCardioEdit(){
 const c=editingCardio;if(!c)return;
 const m=Number(c.minutes),dist=c.distance,wt=c.weight;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||!CARDIO_MET[c.kind]||!Number.isFinite(m)||m<1||m>1440||!validNumber(dist,0,100000)||!validNumber(wt,1,1500))return alert('Check date, activity, duration, distance and bodyweight.');
 c.minutes=m;c.distance=dist===''?null:dist==null?null:Number(dist);c.weight=wt===''?null:wt==null?null:Number(wt);
 const i=state.cardioLogs.findIndex(x=>x.id===c.id);if(i<0)return alert('Activity no longer exists.');
 state.cardioLogs[i]=clone(c);editingCardio=null;save();toast('Activity updated');go('cardio');
}
const oldCardio=cardio;
cardio=function(){
 return oldCardio().replace(/<button class="danger" onclick="deleteCardio\('([^']+)'\)">Delete<\/button>/g,
 (_,id)=>`<div class="row"><button onclick="fjorgeEdit.startCardio('${id}')">Edit</button><button class="danger" onclick="deleteCardio('${id}')">Delete</button></div>`);
};
window.fjorgeEdit={start,set,setExercise,setSet,addSet,removeSet,addExercise,removeExercise,save:saveEdit,cancel,startCardio,cardioSet,saveCardio:saveCardioEdit};
})();
