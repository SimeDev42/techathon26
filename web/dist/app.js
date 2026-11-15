const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const label = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const DEFAULT_STATIONS = [
 {name:'King Harald Bluetooth',short:'Harald',clue:'Look for the Jelling Stone exhibition. Move your player into station 1’s dashed circle.',question:'Around what year was King Harald Bluetooth born?',options:['Around 810 AD','Around 910 AD','Around 1066 AD','Around 1200 AD'],answer:'B',slot:4},
 {name:'Viking Burial Traditions',short:'Burials',clue:'Explore early Viking burial mounds. Move into station 2’s dashed circle.',question:'Before Denmark became Christian, what was the most common way Vikings buried their dead?',options:['Cremation and burial under earth mounds','Burial inside stone churches','Placing bodies inside mountain caves','Sending burning ships out to sea'],answer:'A',slot:7}
];
// Nine physical picture slots are the maximum supported route size.
const stations = (window.JELLING_FIXTURE?.stations ?? DEFAULT_STATIONS).slice(0,9).map((station,i) => ({
 ...station,name:label(station.name,`Station ${i+1}`),short:label(station.short,`Station ${i+1}`),
 clue:label(station.clue,`Move your player into station ${i+1}’s dashed circle to scan its tile.`),
 question:label(station.question,'Ask the museum team for this station’s question.'),
 options:Array.from({length:4},(_,j)=>label(station.options?.[j],`Option ${'ABCD'[j]}`))
}));
const TOTAL = stations.length;
const BEACONS = window.JELLING_FIXTURE?.beacons ?? [{x:82,y:68},{x:244,y:149}];
const CLOSE_RADIUS = 30;
const START = {x:46,y:180};
const KEY = window.JELLING_FIXTURE ? `jelling-ui-lab-${window.JELLING_FIXTURE.mode}` : 'jelling-journey-v1';
const initial = () => ({phase:TOTAL?'NAVIGATING':'EMPTY',target:0,validated:[],attached:[],player:{...START},proximity:0,sound:false,returnChecks:{inventory:false,picture:false}});
let state = initial();
try {
 const saved = JSON.parse(localStorage.getItem(KEY));
 if(saved && ['NAVIGATING','QUESTION','COMPLETE','RETURN_CHECK','REDEEMED'].includes(saved.phase) && Number.isInteger(saved.target) && saved.target>=0 && saved.target<=TOTAL && Array.isArray(saved.validated) && Array.isArray(saved.attached)) {
  const validated = [...new Set(saved.validated.filter(i=>Number.isInteger(i)&&i>=0&&i<TOTAL))];
  const attached = [...new Set(saved.attached.filter(i=>validated.includes(i)))];
  state = {...initial(),...saved,validated,attached,sound:false,returnChecks:{...initial().returnChecks,...saved.returnChecks}};
  if(!TOTAL) state=initial();
  else if(state.target===TOTAL && ['QUESTION','NAVIGATING'].includes(state.phase)) state.phase='COMPLETE';
 }
} catch {}
if(!state.player || !Number.isFinite(state.player.x) || !Number.isFinite(state.player.y)) state.player={...START};
state.player={x:Math.max(20,Math.min(300,state.player.x)),y:Math.max(20,Math.min(200,state.player.y))};
let message='', messageType='info', feedback=null, feedbackTimer, audioContext, beepTimer, saveTimer;
const canvas = $('#oled'), ctx = canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
function save(){clearTimeout(saveTimer);try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function savePosition(){clearTimeout(saveTimer);saveTimer=setTimeout(save,150);}
window.addEventListener('pagehide',save);
function announce(text){$('#announcement').textContent=text;}
function tone(success=true){
 if(!state.sound)return;
 try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const now=audioContext.currentTime;
 [0,.12].forEach((delay,i)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='sine';oscillator.frequency.value=success?(i?880:660):(i?280:360);gain.gain.setValueAtTime(.035,now+delay);gain.gain.exponentialRampToValueAtTime(.001,now+delay+.09);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now+delay);oscillator.stop(now+delay+.1);});}catch{}
}
function syncProximity(){const beacon=BEACONS[state.target];state.proximity=beacon?Math.max(0,Math.min(100,100-Math.hypot(state.player.x-beacon.x,state.player.y-beacon.y)/1.2)):0;}
function band(){return state.proximity<10?'SEARCHING':state.proximity<40?'FAR':state.proximity<75?'NEAR':'CLOSE';}
function canScan(){return state.phase==='NAVIGATING'&&band()==='CLOSE'&&Boolean(stations[state.target]);}
function updateScanAvailability(){
 const ready=canScan(),scanButton=$('#scan');if(scanButton){scanButton.disabled=!ready;scanButton.setAttribute('aria-describedby','scan-hint');}
 $('#scan-pad').setAttribute('aria-disabled',String(!ready&&state.phase!=='QUESTION'));
 const hint=$('#scan-hint');if(hint)hint.textContent=ready?'In range. Take this station’s tile and scan it.':'Scan locked. Move into the highlighted circle on the map.';
 updateNextStep();
 window.jellingCAD?.sync?.();
}
function scheduleBeep(){clearTimeout(beepTimer);if(state.sound&&!feedback&&state.phase==='NAVIGATING'&&band()!=='SEARCHING')beepTimer=setTimeout(()=>{tone();scheduleBeep();},band()==='CLOSE'?400:band()==='NEAR'?1000:2000);}
function text(value,x,y,size=8){ctx.fillStyle='#f6cf70';ctx.font=`${size}px monospace`;ctx.textBaseline='top';ctx.fillText(value,x,y);}
function oled(){
 ctx.fillStyle='#071219';ctx.fillRect(0,0,128,64);
 if(feedback){text(feedback==='correct'?'CORRECT!':feedback==='wrong'?'TRY AGAIN':'WRONG TILE',feedback==='scan'?24:31,6,10);ctx.strokeStyle='#f6cf70';ctx.lineWidth=3;ctx.beginPath();if(feedback==='correct'){ctx.moveTo(48,37);ctx.lineTo(59,47);ctx.lineTo(81,24);}else{ctx.moveTo(55,29);ctx.lineTo(74,47);ctx.moveTo(74,29);ctx.lineTo(55,47);}ctx.stroke();}
 else if(state.phase==='EMPTY'){text('NO ROUTE',8,13,13);text('ASK STAFF',8,39,10);}
 else if(state.phase==='NAVIGATING'){text(`STATION ${String(state.target+1).padStart(2,'0')}`,6,5);text(band(),6,21,12);for(let i=0;i<10;i++){ctx.fillStyle=i<Math.ceil(state.proximity/10)?'#f6cf70':'#2c332f';ctx.fillRect(6+i*12,43,8,12);}}
 else if(state.phase==='QUESTION'){text('TILE ACCEPTED',6,5);text('CHOOSE',6,21,12);text('A  B  C  D',6,43,13);}
 else{text(state.phase==='REDEEMED'?'THANK YOU!':'COMPLETE!',7,7,13);text(`${state.validated.length} / ${TOTAL} TILES`,7,29,10);text(state.phase==='REDEEMED'?'PRIZE REDEEMED':'RETURN TO STAFF',7,49,8);}
 canvas.setAttribute('aria-label',feedback?message||'Answer feedback':state.phase==='QUESTION'?'Tile accepted. Choose A, B, C or D.':state.phase==='NAVIGATING'?`Station ${state.target+1}. Signal ${band().toLowerCase()}.`:state.phase==='EMPTY'?'No route configured. Ask staff.':state.phase==='REDEEMED'?'Prize redeemed.':'Collection complete. Return to staff.');
 window.jellingCAD?.sync?.();
}
function showFeedback(type,spoken){clearTimeout(feedbackTimer);feedback=type;announce(spoken);tone(type==='correct');oled();feedbackTimer=setTimeout(()=>{feedback=null;oled();scheduleBeep();},1100);}
function pendingTiles(){return state.validated.filter(i=>!state.attached.includes(i));}
function renderPlate(){
 const plate=$('#plate');plate.innerHTML='';
 for(let i=0;i<9;i++){
  const col=i%3,row=Math.floor(i/3),station=stations.findIndex(s=>s.slot===i),empty=station>=0&&!state.attached.includes(station),attachable=empty&&state.validated.includes(station);
  const tile=document.createElement(attachable?'button':'div');tile.className=`tile ${empty?'empty':'picture'}${attachable?' attachable':''}`;
  if(!empty)tile.style.backgroundPosition=`${col*50}% ${row*50}%`;
  if(empty){tile.dataset.label=`Tile ${station+1}`;tile.setAttribute('aria-label',attachable?`Attach validated tile ${station+1}`:`Missing tile ${station+1}`);if(attachable)tile.onclick=()=>attach(station);}
  plate.append(tile);
 }
 window.jellingCAD?.sync?.();
}
function updateNextStep(){
 const title=$('#next-title'),copy=$('#next-description');if(!title)return;
 const pending=pendingTiles();let heading,description;
 if(state.phase==='EMPTY'){heading='Ask the museum team';description='No stations are configured. Scanning and answers are unavailable.';}
 else if(state.phase==='REDEEMED'){heading='You’re all checked out';description='Your return and prize are recorded. You can start a new experience below.';}
 else if(state.phase==='RETURN_CHECK'){heading='Staff: check the returned kit';description='Confirm the handheld, collected tiles and picture before redeeming the prize.';}
 else if(state.phase==='QUESTION'){heading='Choose your answer';description='Read the question below. Use A–D on the handheld, your keyboard, or the answer choices.';}
 else if(pending.length){heading=`Attach tile ${pending[0]+1}`;description='Your answer validated this tile. Add it to the picture whenever you’re ready.';}
 else if(state.phase==='COMPLETE'){heading='Return your completed kit';description='Bring the handheld and collected tiles to the museum team for your prize.';}
 else if(canScan()){heading=`Scan station ${state.target+1}’s tile`;description='You’re in range. Take the station’s tile and use the Scan tile button or NFC pad.';}
 else{heading=`Find station ${state.target+1}`;description='Move the blue player into the highlighted scan zone. Only the current target unlocks scanning.';}
 if(title.textContent!==heading)title.textContent=heading;if(copy.textContent!==description)copy.textContent=description;
 $('#next-step').dataset.state=state.phase;
 const action=$('#next-action');
 if(pending.length&&!['QUESTION','RETURN_CHECK','REDEEMED'].includes(state.phase)){
  if(action.dataset.tile!==String(pending[0])){action.innerHTML=`<button class="secondary">Attach tile ${pending[0]+1}</button>`;action.dataset.tile=String(pending[0]);action.querySelector('button').onclick=()=>attach(pending[0]);}
 }else{action.innerHTML='';delete action.dataset.tile;}
}
function renderProgress(){
 const complete=state.validated.length;
 $('#steps').innerHTML=`<div class="progress-summary"><span>${complete} of ${TOTAL} ${TOTAL===1?'tile':'tiles'} collected</span><span>${TOTAL?Math.round(complete/TOTAL*100):0}%</span></div><progress max="${Math.max(TOTAL,1)}" value="${complete}" aria-label="Picture tile collection"></progress>`;
 $('#device-status').textContent=`${String(Math.min(state.target+1,TOTAL)).padStart(2,'0')} / ${String(TOTAL).padStart(2,'0')}`;
}
function showNotice(){
 $('#station-notice')?.remove();if(!message)return;
 const notice=document.createElement('p');notice.id='station-notice';notice.className=`notice notice-${messageType}`;notice.setAttribute('role',messageType==='error'?'alert':'status');notice.textContent=message;$('#station-content').append(notice);
}
function render(){
 syncProximity();save();renderPlate();renderMap();renderProgress();
 $('#sound').textContent=state.sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',state.sound);
 document.querySelectorAll('.answer').forEach(button=>button.disabled=state.phase!=='QUESTION');
 const station=stations[state.target];
 $('#panel-kicker').textContent=state.phase==='EMPTY'?'ROUTE UNAVAILABLE':station?`STATION ${state.target+1} OF ${TOTAL}`:'RETURN & REWARD';
 $('#station-title').textContent=state.phase==='EMPTY'?'No stations available':station?station.name:state.phase==='REDEEMED'?'Thanks for exploring.':'Your collection is complete.';
 $('#station-description').textContent=state.phase==='EMPTY'?'Ask the museum team to load a route, then restart the experience.':station?(state.phase==='QUESTION'?station.question:station.clue):state.phase==='REDEEMED'?'Your kit is returned and your prize is redeemed.':`Return the handheld and ${TOTAL===1?'your collected tile':`all ${TOTAL} collected tiles`} to staff.`;
 let content='';
 if(state.phase==='NAVIGATING')content='<p id="scan-hint" class="scan-hint"></p><button id="scan" class="primary">Scan tile</button>';
 else if(state.phase==='QUESTION')content=`<div class="answer-choices" role="group" aria-label="Answer choices">${station.options.map((option,i)=>`<button class="option" data-choice="${'ABCD'[i]}" aria-label="${'ABCD'[i]}: ${escapeHTML(option)}"><b aria-hidden="true">${'ABCD'[i]}</b><span>${escapeHTML(option)}</span></button>`).join('')}</div><p class="keyboard-hint">You can also press <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> on your keyboard.</p>`;
 else if(state.phase==='COMPLETE')content='<button class="primary" id="return">Begin staff return check</button>';
 else if(state.phase==='RETURN_CHECK')content=`<fieldset class="return-checks"><legend>Confirm the returned kit</legend><label class="check-row"><input id="inventory" type="checkbox" ${state.returnChecks.inventory?'checked':''}> Handheld and ${TOTAL===1?'tile':'all tiles'} returned</label><label class="check-row"><input id="picture-check" type="checkbox" ${state.returnChecks.picture?'checked':''}> Picture placement checked</label></fieldset><button class="primary" id="redeem">Record return & redeem prize</button>`;
 else if(state.phase==='REDEEMED')content='<button class="primary" id="new-session">Start a new experience</button>';
 if(pendingTiles().length)content+=`<div class="tile-actions">${pendingTiles().map(i=>`<button class="secondary attach-button" data-station="${i}">Attach tile ${i+1} to picture</button>`).join('')}</div>`;
 if(station&&state.phase==='NAVIGATING'&&TOTAL>1)content+='<details class="simulation-checks"><summary>Test another tile</summary><p>Other stations stay locked until they become your target.</p><button id="other-tile" class="secondary">Try another station’s tile</button></details>';
 $('#station-content').innerHTML=content;showNotice();
 $('#hint-text').textContent=state.phase==='QUESTION'?'In the museum, this question appears on the station poster.':state.target>=TOTAL?'Staff checks the physical picture. Tile placement is not detected by the handheld.':'The map simulates proximity. Real BLE signals vary; this is not a measurement in metres.';
 $('#scan')?.addEventListener('click',()=>scan(state.target));$('#other-tile')?.addEventListener('click',()=>scan(state.target===0?1:0));
 $('#return')?.addEventListener('click',()=>{state.phase='RETURN_CHECK';message='';render();});
 $('#inventory')?.addEventListener('change',event=>{state.returnChecks.inventory=event.target.checked;save();});
 $('#picture-check')?.addEventListener('change',event=>{state.returnChecks.picture=event.target.checked;save();});
 $('#redeem')?.addEventListener('click',()=>{
  if(!state.returnChecks.inventory||!state.returnChecks.picture){message='Confirm both staff checks before redeeming.';messageType='error';showNotice();announce(message);return;}
  state.phase='REDEEMED';message='Return recorded. Prize redeemed once.';messageType='success';render();announce(message);tone();
 });
 $('#new-session')?.addEventListener('click',confirmReset);
 document.querySelectorAll('.attach-button').forEach(button=>button.onclick=()=>attach(Number(button.dataset.station)));
 document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>pressAnswer(button.dataset.choice));
 updateScanAvailability();oled();scheduleBeep();
}
function scan(index){
 if(!TOTAL||state.target>=TOTAL){announce('No station is available to scan.');return;}
 if(index!==state.target){message='That tile belongs to another station. Follow your current target first.';messageType='error';showNotice();showFeedback('scan',message);return;}
 if(state.phase==='QUESTION'){announce('This tile is already scanned. Choose an answer.');return;}
 if(!canScan()){message='Too far to scan. Move into the current station’s highlighted circle.';messageType='error';showNotice();announce(message);return;}
 clearTimeout(feedbackTimer);feedback=null;state.phase='QUESTION';message='';clearTimeout(beepTimer);render();announce(`Tile ${index+1} scanned. Choose an answer.`);focusHeading('#station-title');tone();
}
function focusHeading(selector){const heading=$(selector);heading.setAttribute('tabindex','-1');heading.focus();}
function pressAnswer(letter){const button=document.querySelector(`[data-answer="${letter}"]`);button.classList.add('pressed');window.jellingCAD?.sync?.();setTimeout(()=>{button.classList.remove('pressed');window.jellingCAD?.sync?.();},140);answer(letter);}
function answer(letter){
 if(state.phase!=='QUESTION'){announce('Scan the current station tile before answering.');return;}
 if(letter===stations[state.target].answer){const index=state.target;state.validated.push(index);state.target++;state.phase=state.target===TOTAL?'COMPLETE':'NAVIGATING';message=`Correct. Tile ${index+1} is ready to attach.`;messageType='success';render();focusHeading('#next-title');showFeedback('correct',message);}
 else{message='Not quite. Try another answer. Your tile stays scanned.';messageType='error';showNotice();showFeedback('wrong',message);document.querySelectorAll('[data-choice]').forEach(button=>button.classList.toggle('incorrect',button.dataset.choice===letter));}
}
function attach(index){if(!state.validated.includes(index)||state.attached.includes(index))return;state.attached.push(index);message=`Tile ${index+1} attached to the picture.`;messageType='success';render();focusHeading('#next-title');announce(message);tone();}
function reset(){clearTimeout(feedbackTimer);feedback=null;state=initial();message='';render();announce('New experience started. Move to station one.');}
function showDialog(html){$('#dialog-content').innerHTML=html;const heading=$('#dialog-content h2');if(heading){heading.id='dialog-title';$('#info-dialog').setAttribute('aria-labelledby','dialog-title');}$('#info-dialog').showModal();}
function confirmReset(){showDialog('<h2>Start a new experience?</h2><p>This clears this browser’s saved tiles and player position.</p><div class="dialog-actions"><button id="cancel-reset" class="secondary">Keep exploring</button><button class="primary" id="confirm-reset">Restart experience</button></div>');$('#cancel-reset').onclick=()=>$('#info-dialog').close();$('#confirm-reset').onclick=()=>{$('#info-dialog').close();reset();};}
document.querySelectorAll('.answer').forEach(button=>button.onclick=()=>pressAnswer(button.dataset.answer));
document.addEventListener('keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||$('#info-dialog').open||/INPUT|TEXTAREA/.test(event.target.tagName))return;const letter=event.key.toUpperCase();if(/^[ABCD]$/.test(letter)&&state.phase==='QUESTION')pressAnswer(letter);});
$('#scan-pad').onclick=()=>scan(state.target);
$('#sound').onclick=()=>{state.sound=!state.sound;save();$('#sound').textContent=state.sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',state.sound);scheduleBeep();if(state.sound)tone();};
$('#reset').onclick=confirmReset;
$('#help').onclick=()=>showDialog('<h2>Find. Scan. Solve.</h2><ol><li>Move the player on the map. Click, drag, or use the arrow controls.</li><li>Enter the highlighted station’s dashed circle to unlock Scan tile.</li><li>Scan, read the question, and choose A–D. Wrong answers allow another try.</li><li>Attach the validated tile to the picture, then follow the next beacon.</li><li>Return the handheld and collected tiles for a staff check and prize.</li></ol><p>This is a browser simulation of BLE, NFC and a 128 × 64 OLED. Questions are demonstration content. Your progress saves on this browser.</p>');
$('.close-dialog').onclick=()=>$('#info-dialog').close();$('#info-dialog').onclick=event=>{if(event.target===$('#info-dialog'))$('#info-dialog').close();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(beepTimer);else scheduleBeep();});
initMap();render();
