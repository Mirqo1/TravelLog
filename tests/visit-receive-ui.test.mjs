import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';
const load = text => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
const dates = await load(await readFile('app/utils/visitDate.js', 'utf8'));
let index=0,slots=[],effects=[],accepted=[],dreams=[],closed=0,alerts=[],premium=false,identity='cloud-recipient';
const data={kind:'invitation',sourceId:'a'.repeat(64),author:'Miroslav',visit:{name:'Zoo',locationName:'Košice',countryCode:'SK',
 location:{latitude:48.8,longitude:21.2},date:'2026-09-29',visitTime:'09:30',notes:'Shared sender note'},photos:[]};
const components=['ActivityIndicator','Image','KeyboardAvoidingView','Modal','Pressable','ScrollView','Switch','Text','TextInput','View','SafeAreaProvider','SafeAreaView','VisitCalendar'];
const mocks={...dates,...Object.fromEntries(components.map(c=>[c,c])),theme:{},t:x=>x,useLanguage(){},
 React:{createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)})},
 StyleSheet:{create:x=>x},Platform:{OS:'android'},Alert:{alert:(...args)=>alerts.push(args)},
 useRef(value){const i=index++;slots[i]??={current:value};return slots[i];},
 useState(value){const i=index++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},
 useEffect(fn,deps){const i=index++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){slots[i]={deps};effects.push(fn);}},
 useAuth:()=>({notebookId:identity}),useTrips:()=>({loading:false,refreshAfterSync:async()=>{}}),
 usePhotoAccess:()=>({canAddPhotos:premium}),useWishlist:()=>({premium,ready:true,items:[],save:async d=>dreams.push(d)}),
 acceptVisitTransfer:async props=>{assert.equal(props.isCurrent(),true);accepted.push(props);return{already:false};},
};
globalThis.receiveUI=mocks;
const raw=(await readFile('app/components/VisitReceiveModal.js','utf8')).replace(/^import .*;\n/gm,'');
const code=transformSync(raw,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx']}).code;
const {default:Receive}=await load(`const {${Object.keys(mocks).join(',')}}=globalThis.receiveUI;\n${code}`);
const render=()=>{index=0;const tree=Receive({data,onClose:()=>closed++});const jobs=effects;effects=[];jobs.forEach(fn=>fn());return tree;};
const walk=n=>n&&typeof n==='object'?[n,...(n.children||[]).flatMap(walk)]:[];
let tree=render();tree=render();
const button=label=>walk(tree).find(n=>n.type==='Pressable'&&(n.children||[]).some(c=>c?.type==='Text'&&c.children.includes(label)));
assert.equal(accepted.length,0);assert.equal(dreams.length,0);
assert.equal(button('Prijať pozvánku').props.disabled,true);
await button('Prijať pozvánku').props.onPress();assert.equal(accepted.length,0);
button('Odmietnuť pozvánku').props.onPress();assert.equal(closed,1);assert.equal(accepted.length,0);
walk(tree).find(n=>n.type==='Switch'&&n.props.accessibilityLabel==='Potvrdzujem, že som toto miesto navštívil').props.onValueChange(true);
tree=render();assert.equal(button('Prijať pozvánku').props.disabled,false);
await button('Prijať pozvánku').props.onPress();tree=render();
assert.equal(accepted.length,1);assert.equal(accepted[0].confirmed,true);assert.equal(accepted[0].includePhotos,false);
assert.equal(accepted[0].date,'2026-09-29');assert.equal(accepted[0].visitTime,'09:30');
assert.equal(closed,2);
button('Moje sny').props.onPress();tree=render();assert.equal(button('Prijať pozvánku').props.disabled,true);
premium=true;tree=render();assert.equal(button('Prijať pozvánku').props.disabled,false);
await button('Prijať pozvánku').props.onPress();tree=render();
assert.equal(dreams.length,1);assert.equal(dreams[0].id,'shared-wish-'+data.sourceId);assert.equal(dreams[0].notes,'');
assert.equal(accepted.length,1,'Dream acceptance must not log a visited place');
console.log('PASS: recipient preview/decline without writes, confirmation gate, Free text import, explicit local date/time and separate Premium dreams acceptance.');
