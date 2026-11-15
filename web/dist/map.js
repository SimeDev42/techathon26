// A schematic gallery simulation. Distances are map units, not measured BLE metres.
let mapViewPhase=null,mapOpen=true;
function setMapOpen(open){mapOpen=open;const section=document.querySelector('.simulation');section.classList.toggle('map-collapsed',!open);const toggle=section.querySelector('.map-collapse');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Hide map':'Show map';}
function initMap(){
 const section=document.createElement('section');section.className='simulation';section.id='museum-simulation';section.setAttribute('aria-label','Museum movement simulation');
 document.querySelector('.station-panel').before(section);document.querySelector('a[href="#museum-simulation"]')?.addEventListener('click',()=>setMapOpen(true));
}
function renderMap(){
 const section=document.querySelector('.simulation');if(!section)return;if(mapViewPhase!==state.phase){mapViewPhase=state.phase;mapOpen=state.phase!=='QUESTION';}
 section.innerHTML=`<div class="map-heading"><h2>Museum map</h2><strong id="map-band"></strong><button type="button" class="map-collapse" aria-controls="map-content">Hide map</button></div><div id="map-content">
 <svg class="museum-map" viewBox="0 0 320 220" tabindex="0" role="group" aria-label="Museum map. Click or drag to move your player. Arrow keys also move the player." aria-describedby="map-instructions">
 <defs><pattern id="floor-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="currentColor" stroke-width=".5"/></pattern></defs>
 <rect class="map-floor" x="7" y="7" width="306" height="206" rx="8"/><rect class="map-grid" x="10" y="10" width="300" height="200" rx="6" fill="url(#floor-grid)"/>
 <path class="map-route" d="M46 180V115Q46 100 62 100H145Q164 100 164 119V149H244"/>
 <g class="map-display"><rect x="125" y="27" width="61" height="31" rx="3"/><path d="M137 39h37m-37 7h25"/></g>
 <g class="map-display"><rect x="34" y="122" width="45" height="16" rx="3"/><rect x="192" y="183" width="55" height="13" rx="3"/></g>
 <path class="map-door" d="M22 212h40"/><text class="map-room-label" x="23" y="201">ENTRY</text>
 <rect class="return-desk" x="244" y="19" width="56" height="22" rx="3"/><text class="map-desk-label" x="272" y="33" text-anchor="middle">RETURN</text>
 <line class="map-signal" id="map-signal"/>
 ${BEACONS.map((b,i)=>`<g class="map-beacon ${state.target===i?'target':''} ${state.validated.includes(i)?'collected':''}" transform="translate(${b.x} ${b.y})"><title>${escapeHTML(stations[i]?.name||`Station ${i+1}`)}</title><circle class="scan-zone" r="${CLOSE_RADIUS}"/><circle class="beacon-wave" r="18"/><circle class="beacon-marker" r="11"/><text text-anchor="middle" y="4">${i+1}</text></g>`).join('')}
 <g id="map-player" class="map-player"><circle class="player-halo" r="14"/><circle class="player-marker" r="7"/><path d="m-3 1 3-4 3 4"/><text y="28" text-anchor="middle">YOU</text></g></svg>
 <div class="map-bottom"><span class="map-key"><i></i> <span id="map-target"></span></span><div class="map-direction-controls" aria-label="Move player">${[['north',0],['east',90],['south',180],['west',270]].map(([d,angle])=>`<button type="button" data-move="${d}" aria-label="Move ${d}"><svg viewBox="0 0 20 20" aria-hidden="true" style="transform:rotate(${angle}deg)"><path d="M10 15V5m-4 4 4-4 4 4"/></svg></button>`).join('')}</div></div>
 <p id="map-instructions">Click or drag to move. Use arrow keys when the map is focused.</p><div class="map-legend"><span><i class="legend-player"></i>You</span><span><i class="legend-target"></i>Current target</span><span><i class="legend-zone"></i>Scan zone</span></div></div>`;
 setMapOpen(mapOpen);section.querySelector('.map-collapse').onclick=()=>setMapOpen(!mapOpen);
 const map=section.querySelector('.museum-map');
 const movePointer=e=>{const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(map.getScreenCTM().inverse());movePlayer(point.x,point.y);};
 map.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();map.focus({preventScroll:true});map.setPointerCapture(e.pointerId);movePointer(e);});
 map.addEventListener('pointermove',e=>{if(map.hasPointerCapture(e.pointerId))movePointer(e);});
 const release=e=>{if(map.hasPointerCapture(e.pointerId))map.releasePointerCapture(e.pointerId);};map.addEventListener('pointerup',release);map.addEventListener('pointercancel',release);
 const directions={north:[0,-8],east:[8,0],south:[0,8],west:[-8,0]};
 const step=d=>movePlayer(state.player.x+directions[d][0],state.player.y+directions[d][1]);
 map.addEventListener('keydown',e=>{const direction={ArrowUp:'north',ArrowRight:'east',ArrowDown:'south',ArrowLeft:'west'}[e.key];if(direction){e.preventDefault();step(direction);}});
 section.querySelectorAll('[data-move]').forEach(button=>button.onclick=()=>step(button.dataset.move));updateMap();
}
function movePlayer(x,y){
 if(!TOTAL)return;const previousBand=band();state.player={x:Math.max(20,Math.min(300,x)),y:Math.max(20,Math.min(200,y))};syncProximity();savePosition();updateMap();updateScanAvailability();oled();
 // Keep a running beep timer alive while dragging, so movement cannot silence it.
 if(previousBand!==band()){scheduleBeep();if(state.phase==='NAVIGATING')announce(`Signal ${band().toLowerCase()}. ${canScan()?'Scanning unlocked.':'Keep moving toward the target.'}`);}
 if(canScan()&&message.startsWith('Too far')){message='';document.querySelector('#station-notice')?.remove();}
}
function updateMap(){
 const marker=document.querySelector('#map-player');if(!marker)return;marker.setAttribute('transform',`translate(${state.player.x} ${state.player.y})`);
 document.querySelectorAll('[data-move]').forEach(button=>button.disabled=!TOTAL);
 const target=BEACONS[state.target],signal=document.querySelector('#map-signal');signal.style.display=target?'':'none';
 if(target){signal.setAttribute('x1',state.player.x);signal.setAttribute('y1',state.player.y);signal.setAttribute('x2',target.x);signal.setAttribute('y2',target.y);}
 document.querySelector('#map-band').textContent=!TOTAL?'No route':target?(state.phase==='QUESTION'?'Tile scanned':band().toLowerCase()):'Complete';
 document.querySelector('#map-target').textContent=!TOTAL?'No beacons configured':target?`Target ${state.target+1}: ${stations[state.target].name}`:'All stations collected';
 document.querySelector('.simulation').classList.toggle('in-range',Boolean(target&&band()==='CLOSE'));
}
