// Prototype route only. This script is never loaded by the visitor pages.
const fixtureParams=new URLSearchParams(location.search);
const fixtureMode=fixtureParams.get('data')||'demo';
const fixtureStations=[
 {name:'The Great Jelling Stone',short:'Jelling',clue:'Move your player into the dashed circle around station 1.',question:'Look at the picture. What winds across the face of the stone?',options:['A sailing ship','An intertwined animal','A crown','A longhouse'],answer:'B',slot:4},
 {name:'A stone that travelled',short:'The world',clue:'Follow the second beacon to discover copies around the world.',question:'What lets people experience the stone in other countries?',options:['Moving the original','Only written descriptions','Copies of the stone','A different original'],answer:'C',slot:7}
];
const worstStations=[
 {...fixtureStations[0],name:'The Great Jelling Stone — The Danish Church of Saint Katharine in Regent’s Park, London',short:'Runensteinvermittlung',clue:'',question:'Đặng Thị Ngọc Hân asks: “Which detail connects the Jelling Stone with its copies in museums and churches around the world?”',options:['An intertwined animal carved across the stone, preserved in every faithful reproduction','J','王秀英：石碑上的交織動物圖案與歷史故事 🧩','A commemorative plaque labelled <b>Jelling & Denmark</b>'],answer:'A'},
 {...fixtureStations[1],name:'Runensteinvermittlungsausstellungsbereich',short:'世界のルーン石碑',clue:'Find the replica in the exhibition’s international gallery. The station name may be displayed in the language of the host museum.',question:'How can a visitor distinguish a reproduction from the original when both preserve the same carving?',options:['Look at the exhibition label for the place, date, and origin of this particular stone','Read only the first line','Assume both are originals','Ask the museum team'],answer:'A'}
];
const maxStations=Array.from({length:9},(_,i)=>({...fixtureStations[i%2],name:`Gallery ${i+1}: ${['Jelling','London','Paris','Viborg','Yorba Linda','Hvidovre','Denmark','The carving','The journey'][i]}`,short:`Gallery ${i+1}`,slot:i}));
const datasets={demo:fixtureStations,worst:worstStations,empty:[],one:[fixtureStations[0]],max:maxStations};
const selected=datasets[fixtureMode]??datasets.demo;
window.JELLING_FIXTURE={mode:fixtureMode,stations:selected,beacons:selected.length===2?[{x:82,y:68},{x:244,y:149}]:selected.map((_,i)=>({x:55+(i%3)*105,y:48+Math.floor(i/3)*66}))};
document.body.classList.add('ui-lab');
if(fixtureParams.get('text')==='large')document.documentElement.style.fontSize='200%';
const fixtureControl=document.createElement('fieldset');fixtureControl.className='fixture-control';
fixtureControl.innerHTML='<legend>UI test data</legend>'+Object.entries({demo:'Demo data',worst:'Worst case',empty:'Empty',one:'One station',max:'9 stations'}).map(([value,label])=>`<label><input type="radio" name="fixture" value="${value}" ${value===fixtureMode?'checked':''}><span>${label}</span></label>`).join('')+'<label class="large-text-option"><input type="checkbox" name="large-text" '+(fixtureParams.get('text')==='large'?'checked':'')+'>200% text</label>';
fixtureControl.addEventListener('change',e=>{const params=new URLSearchParams(location.search);if(e.target.name==='fixture')params.set('data',e.target.value);else if(e.target.checked)params.set('text','large');else params.delete('text');location.search=params.toString();});
document.body.append(fixtureControl);
