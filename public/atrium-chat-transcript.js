/* ATRIUM Chat: meeting transcripts.
   In the live meeting room the chair (or a director) can press Record transcript. A consent step comes first: everyone on the meeting has to agree, and a notice is posted to the meeting chat
   as the recording starts. While it records, a bar stays on screen with the time and a Stop button. The words are turned into text on ATRIUM's speech service (the audio is not kept) and saved
   as a Note linked to the meeting, in the recorder's own Notes, every minute and again when it stops. Only the recorder can read it until they choose to add it to the minutes or email it,
   using the tools Notes already has. A notice is posted when it stops. Speakers are not identified.
   Uses ATRIUM's speechToken (the same speech route Notes uses, through the speech helper in /atrium-speech/sdk.js), noteSave, noteToMeeting and send. It does not touch the Chat microphone or
   voice typing code. If the speech service is not working the start fails with its plain message and nothing is posted. Needs window.AtriumChat and the live meeting room. */
(function(){
'use strict';
var D=document, B=D.body, C=window.AtriumChat;
if(!C||!D.getElementById('nxRoom')||!window.AtriumRoom) return;
function $(s,r){ return (r||D).querySelector(s) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function first(id){ var p=C.person(id); return p&&p.n?p.n.split(' ')[0]:'Someone' }
var MAXBODY=55000;
function hhmm(ms){ var d=new Date(ms), h=d.getHours()%12||12; return h+':'+String(d.getMinutes()).padStart(2,'0')+(d.getHours()<12?'am':'pm') }
function elapsed(ms){ var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60); s=s%60; return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0') }

var R=null;      /* the recording in progress: { rec, mid, title, date, gid, started, lines, notes:[ids], timers, stopping } */
var barEl=D.createElement('div'); barEl.id='nxRecBar'; barEl.innerHTML='<span class="nxd"></span><b>Recording a transcript</b><span id="nxRecT">0:00</span><span id="nxRecN" class="nxn"></span><button type="button" id="nxRecStop">Stop</button>'; B.appendChild(barEl);

function loadSdk(){ return window.SpeechSDK?Promise.resolve():new Promise(function(ok,no){ var sc=D.createElement('script'); sc.src='/atrium-speech/sdk.js?v=1'; sc.onload=ok; sc.onerror=function(){ no(new Error('The speech helper did not load. Check the connection and try again.')) }; D.head.appendChild(sc) }) }

/* ---------- the sheets ---------- */
function sheet(id,html){ var o=D.createElement('div'); o.className='ov nx'; o.id=id; o.innerHTML='<div class="sheet">'+html+'</div>'; D.body.appendChild(o); o.addEventListener('click',function(e){ if(e.target===o||e.target.closest('[data-x]')) o.classList.remove('on') }); return o }
var consent=sheet('nxRecC','<h3>Record a transcript?</h3><div class="lead" id="nxRcL"></div><ul class="nx-rcl"><li>Everyone on this meeting must agree to being recorded. Tell them before you start.</li><li>A notice goes into the meeting chat as soon as recording begins, and another when it stops.</li><li>The words are turned into text. The audio is not kept.</li><li>The text is saved in <b>your</b> Notes, linked to this meeting. Only you can read it until you add it to the minutes or email it.</li><li>Speakers are not identified.</li></ul><label class="nx-chk"><input type="checkbox" id="nxRcOk"> Everyone here has agreed to be recorded</label><div class="nx-rcerr" id="nxRcE" hidden></div><div class="row" style="margin-top:12px"><button type="button" class="cb" data-x>Cancel</button><button type="button" class="cb go" id="nxRcGo" disabled>Start recording</button></div>');
var done=sheet('nxRecD','<h3>Transcript saved</h3><div class="lead" id="nxRdL"></div><div class="row" style="margin-top:12px"><button type="button" class="cb" data-x>Close</button><button type="button" class="cb" id="nxRdMin">Add to the minutes</button><button type="button" class="cb go" id="nxRdOpen">Open in Notes</button></div>');
$('#nxRcOk').addEventListener('change',function(){ $('#nxRcGo').disabled=!this.checked });

/* ---------- the button in the room ---------- */
var raEl=$('#nxRA');
function inject(){ if(!raEl||$('#nxRRec',raEl)) return; var end=$('#nxREnd',raEl); var cur=window.AtriumRoom.current&&window.AtriumRoom.current(); if(!end&&!R) return; if(!cur||!cur.meeting||cur.meeting.closed) return;
  var row=D.createElement('div'); row.className='row'; row.style.marginTop='8px'; var mine=R&&R.mid===String(cur.id);
  row.innerHTML=R?'<button type="button" class="cb" id="nxRRec">'+(mine?'Stop recording':'Recording another meeting')+'</button>':'<button type="button" class="cb" id="nxRRec">Record transcript</button>'; raEl.appendChild(row) }
if(raEl) new MutationObserver(function(){ clearTimeout(inject.t); inject.t=setTimeout(inject,20) }).observe(raEl,{childList:true});
D.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#nxRRec'); if(!b) return; e.stopPropagation(); e.preventDefault();
  if(R){ if(!b.textContent.match(/^Stop/)) return; stopRec(false); return }
  var cur=window.AtriumRoom.current(); if(!C.real()){ C.flash('Transcripts need the signed-in Chat. This is practice data.'); return }
  $('#nxRcL').textContent='Meeting: '+cur.meeting.title; $('#nxRcOk').checked=false; $('#nxRcGo').disabled=true; $('#nxRcE').hidden=true; $('#nxRcGo').textContent='Start recording';
  D.querySelectorAll('.ov.nx.on').forEach(function(x){ x.classList.remove('on') }); consent.classList.add('on') },true);
$('#nxRcGo').addEventListener('click',function(){ startRec(this) });
$('#nxRecStop').addEventListener('click',function(){ stopRec(false) });

/* ---------- recording ---------- */
function say(text){ var el=$('#nxRcE'); el.textContent=text; el.hidden=false }
async function post(gid,body){ try{ var j=await C.api('send',{gid:gid,body:body}); if(j&&j.msg&&C.ingest) C.ingest([j.msg]); return true }catch(er){ return false } }
async function startRec(btn){ var cur=window.AtriumRoom.current(); if(!cur||R) return; var m=cur.meeting, gid=m.gid||''; if(!gid||!C.hasGroup(gid)){ say('This meeting has no chat on this screen, so the notice cannot be posted. Open the meeting chat first.'); return }
  btn.disabled=true; btn.textContent='Starting...'; $('#nxRcE').hidden=true; var rec=null;
  try{
    var t=await C.api('speechToken'); await loadSdk(); var SDK=window.SpeechSDK;
    var cfg=SDK.SpeechConfig.fromAuthorizationToken(t.token,t.region); cfg.speechRecognitionLanguage=/^en/i.test(navigator.language||'')?navigator.language:'en-AU';
    rec=new SDK.SpeechRecognizer(cfg,SDK.AudioConfig.fromDefaultMicrophoneInput());
    var run={rec:rec,mid:String(m.id),title:m.title,date:m.date||'',gid:gid,started:Date.now(),lines:[],notes:[],timers:[],stopping:false,SDK:SDK};
    rec.recognized=function(s,e){ if(!R||R!==run) return; if(e.result.reason===SDK.ResultReason.RecognizedSpeech&&e.result.text){ run.lines.push({t:Date.now(),x:e.result.text}); $('#nxRecN').textContent=run.lines.length+' lines' } };
    rec.canceled=function(s,e){ if(!R||R!==run||run.stopping) return; stopRec(true,e&&e.errorDetails) };
    await new Promise(function(ok,no){ rec.startContinuousRecognitionAsync(ok,no) });
    R=run;
  }catch(er){ try{ if(rec) rec.close() }catch(x){} var msg=String((er&&er.message)||er||''); btn.disabled=false; btn.textContent='Start recording';
    say(/permission|denied|NotAllowed|not allowed|dismissed/i.test(msg)?'The microphone is off for ATRIUM. Allow it in the browser or phone settings, then try again.':(msg||'Recording could not start.')); return }
  /* it is recording: now say so in the chat. If the notice cannot be posted, do not record. */
  var ok=await post(gid,'Recording notice: '+first(C.me())+' has started a transcript of “'+m.title+'”. The words are saved as text and the audio is not kept. If you do not agree, say so now and it will be stopped.');
  if(!ok){ R.stopping=true; try{ R.rec.stopContinuousRecognitionAsync(function(){ try{ R.rec.close() }catch(x){} },function(){}) }catch(x){} R=null; btn.disabled=false; btn.textContent='Start recording'; say('The notice could not be posted to the meeting chat, so recording was not started. Try again.'); return }
  consent.classList.remove('on'); B.classList.add('nx-rec'); tickBar();
  R.timers.push(setInterval(tickBar,1000)); R.timers.push(setInterval(function(){ save(false) },60000));
  R.timers.push(setInterval(async function(){ if(!R) return; try{ var t2=await C.api('speechToken'); R.rec.authorizationToken=t2.token }catch(e){} },8*60000));
  C.flash('Recording. Say so to anyone who joins late.'); var rb=$('#nxRRec'); if(rb) rb.closest('.row').remove(); inject() }
function tickBar(){ if(!R) return; $('#nxRecT').textContent=elapsed(Date.now()-R.started) }
function bodies(run){ var head='Transcript of '+run.title+(run.date?' ('+run.date+')':'')+'. Recorded by '+C.person(C.me()).n+'. Speakers are not identified.\n\n', text=run.lines.map(function(l){ return '['+hhmm(l.t)+'] '+l.x }).join('\n'), parts=[], cur='';
  text.split('\n').forEach(function(line){ if((cur+line).length>MAXBODY){ parts.push(cur); cur='' } cur+=(cur?'\n':'')+line }); parts.push(cur);
  return parts.map(function(p,i){ return (i?'Transcript of '+run.title+', part '+(i+1)+'\n\n':head)+p }) }
function save(final){ var run=R||lastRun; if(!run) return Promise.resolve(null); run.chain=(run.chain||Promise.resolve()).then(function(){ return doSave(run,final) }); return run.chain }
async function doSave(run,final){ if(!run.lines.length) return null; var bs=bodies(run), res=null;
  for(var i=0;i<bs.length;i++){ try{ var j=await C.api('noteSave',{id:run.notes[i]||undefined,title:'Transcript: '+run.title+(bs.length>1?' (part '+(i+1)+')':'')+(run.date?' '+run.date:''),body:bs[i],meetingId:run.mid,meetingTitle:run.title,lang:'en-AU'}); if(j&&j.note){ run.notes[i]=j.note.id; res=j.note } }catch(er){ if(final) C.flash((er&&er.message)||'The transcript could not be saved to Notes.') } }
  return res }
var lastRun=null;
async function stopRec(dropped,why){ var run=R; if(!run||run.stopping) return; run.stopping=true; run.timers.forEach(clearInterval); lastRun=run;
  try{ run.rec.stopContinuousRecognitionAsync(function(){ try{ run.rec.close() }catch(x){} },function(){ try{ run.rec.close() }catch(x){} }) }catch(x){ try{ run.rec.close() }catch(y){} }
  B.classList.remove('nx-rec'); R=null; var note=await save(true); var rb=$('#nxRRec'); if(rb&&rb.closest('.row')) rb.closest('.row').remove(); inject();
  var me=first(C.me()); await post(run.gid,'Recording stopped. '+(run.lines.length?'A transcript was saved to '+me+'’s Notes. Only '+me+' can read it unless it is added to the minutes.':'Nothing was captured, so no transcript was saved.'));
  if(!run.lines.length){ C.flash(dropped?'Recording stopped, and nothing was captured.':'Nothing was captured, so no transcript was saved.'); return }
  $('#nxRdL').textContent=(dropped?'The speech service dropped out'+(why?' ('+String(why).slice(0,80)+')':'')+', so recording stopped. ':'')+run.lines.length+' lines, '+elapsed(Date.now()-run.started)+', saved in your Notes'+(run.notes.length>1?' in '+run.notes.length+' parts':'')+'. Only you can read it until you add it to the minutes.';
  D.querySelectorAll('.ov.nx.on').forEach(function(x){ x.classList.remove('on') }); var mb=$('#nxRdMin'); mb._sure=false; mb.disabled=false; mb.textContent='Add to the minutes'; done.classList.add('on'); done._run=run }
$('#nxRdOpen').addEventListener('click',function(){ var r=done._run; done.classList.remove('on'); if(r&&r.notes[0]&&window.openAtriumNotes) window.openAtriumNotes(null,r.notes[0]) });
$('#nxRdMin').addEventListener('click',async function(){ var r=done._run; if(!r||!r.notes.length) return; var b=this; if(!b._sure){ b._sure=true; b.textContent='Share with everyone on the meeting?'; return } b.disabled=true;
  try{ for(var i=0;i<r.notes.length;i++) await C.api('noteToMeeting',{id:r.notes[i],meetingId:r.mid}); C.flash('Added to the meeting minutes.'); done.classList.remove('on') }catch(er){ C.flash((er&&er.message)||'It could not be added to the minutes.'); b.disabled=false } });
/* ending the meeting while it is still recording: stop the recording first */
D.addEventListener('click',function(e){ if(R&&e.target.closest&&e.target.closest('#nxEGo')){ e.stopPropagation(); e.preventDefault(); C.flash('Stop the recording first, then end the meeting.') } },true);
window.addEventListener('beforeunload',function(e){ if(R){ e.preventDefault(); e.returnValue='A transcript is recording.'; return e.returnValue } });
window.AtriumTranscript={ active:function(){ return !!R } };
})();
