import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';
const read = path => readFile(path, 'utf8');
const load = src => import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const dates = await load(await read('app/utils/visitDate.js'));
globalThis.repeatDates = dates;
const repeat = await load((await read('app/utils/repeatVisits.js')).replace("import { localDate, localTime } from './visitDate';", 'const {localDate,localTime} = globalThis.repeatDates;'));
const old = { id: 'old', name: 'ZOO Košice', countryCode: 'SK', locationName: 'Košice, Slovensko',
  location: { latitude: 48.8, longitude: 21.2 }, date: '2014-01-01', visitTime: '12:00', rating: 5,
  photos: [{ id:'photo' }], notes: 'Private', tags: ['family'], description: 'Old story' };
const before = JSON.stringify(old);
const draft = repeat.repeatVisitDraft(old, new Date(2026,8,30,9,15));
assert.equal(draft.date, '2026-09-30'); assert.equal(draft.visitTime, '09:15');
assert.equal(draft.id, undefined); assert.equal(draft.rating,0); assert.equal(draft.notes,'');
assert.equal(draft.description,''); assert.deepEqual(draft.photos,[]); assert.deepEqual(draft.tags,[]);
assert.notEqual(draft.location, old.location); assert.equal(JSON.stringify(old),before);
const later = {...draft,id:'new'};
assert.equal(repeat.samePlace(old,later),true);
assert.equal(repeat.samePlace(old,{...later,name:'Nearby hospital'}),false);
assert.equal(repeat.samePlace(old,{...later,location:{latitude:49,longitude:21.2}}),false);
assert.equal(repeat.samePlace(old,{...later,countryCode:'HU'}),false);
assert.equal(repeat.samePlace(old,{...later,name:'Zoo Kosice',location:{latitude:48.80005,longitude:21.2}}),true);
assert.equal(repeat.samePlace({...old,placeId:'google:a'},{...later,placeId:'google:b'}),false);
assert.equal(repeat.samePlace({...old,placeId:'google:a'},{...later,placeId:'google:a',name:'Renamed zoo'}),true);
assert.deepEqual(repeat.visitsAtPlace([old,later],draft).map(v=>v.id),['new','old']);
assert.equal(repeat.visitsAtPlace([old,later],old,'old').length,1);
const groups = repeat.placeMarkers([old,later,{...old,id:'other',name:'Hospital'}]);
assert.equal(groups.length,2); assert.equal(groups[0].trips.length,2);
const backup = await load(await read('app/utils/backup.js'));
assert.equal(backup.portableTrips([later])[0].placeId,draft.placeId);
assert.equal(backup.validateBackup({version:1,revision:'r',trips:backup.portableTrips([later])}).trips.length,1);
assert.equal(backup.mergeBackup([old],[later],'user').length,2);
// Real detail action opens a clean new draft and calls add, never update.
let slots=[], index=0, effects=[], added=[],closed=0;
const names=['Modal','Pressable','ScrollView','Text','View','SafeAreaProvider','SafeAreaView','MapView','Marker','VisitPhotoGallery','TripShareModal','AddPlaceModal'];
const mocks={...repeat,...dates,...Object.fromEntries(names.map(n=>[n,n])),t:x=>x,useLanguage(){},theme:{},
 React:{createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)})},
 StyleSheet:{create:x=>x},useState(initial){const i=index++; if(!(i in slots))slots[i]=initial;return[slots[i],v=>slots[i]=v];},
 useEffect(fn,deps){const i=index++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){slots[i]={deps};effects.push(fn);}},
 useTrips:()=>({addTrip:async d=>added.push(d)}),usePhotoAccess:()=>({canAddPhotos:false}),
 normalizeTags:backup.normalizeTags,validLocation:()=>true,
};
globalThis.repeatMocks=mocks;
const compiled=transformSync((await read('app/components/TripDetailsModal.js')).replace(/^import .*;\n/gm,''),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx']}).code;
const {default:Details}=await load(`const {${Object.keys(mocks).join(',')}}=globalThis.repeatMocks;\n${compiled}`);
const render=()=>{index=0;const tree=Details({visible:true,trip:old,onClose:()=>closed++,onEdit(){},onDelete(){}});const jobs=effects;effects=[];jobs.forEach(fn=>fn());return tree;};
const walk=(node)=>node&&typeof node==='object'?[node,...(node.children||[]).flatMap(walk)]:[];
let tree=render();
const action=walk(tree).find(n=>n.type==='Pressable'&&walk(n).some(child=>child.type==='Text'&&child.children.includes('Navštívil som znova')));
assert.ok(action,'Repeat action is available in Free'); action.props.onPress(); tree=render();
const modal=walk(tree).find(n=>n.type==='AddPlaceModal'); assert.equal(modal.props.visible,true);
assert.equal(modal.props.initialTrip.id,undefined);assert.deepEqual(modal.props.initialTrip.photos,[]);
await modal.props.onSave(modal.props.initialTrip); assert.equal(added.length,1);assert.equal(closed,1);
assert.equal(JSON.stringify(old),before);
console.log('PASS: separate repeat draft, untouched original/photos, date/time, conservative identity, map groups, backup and Free detail add flow.');
