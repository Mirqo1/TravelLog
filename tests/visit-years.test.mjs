import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';
const read = p => readFile(p, 'utf8');
const load = src => import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const years = await load(await read('app/utils/visitYears.js'));
const dates = ['2026-02-02','2017-10-01','2017-01-01','2014-12-12'];
const trips = dates.map((date,i) => ({ id: String(i), name: String(i), date, countryCode: 'SK', createdAt: '2026-09-23' }));
assert.deepEqual(years.yearRange(trips,2026),{min:2014,max:2026});
assert.equal(years.yearJumpIndex(trips,2017),1);
assert.equal(years.yearJumpIndex(trips,2016),3);
assert.equal(years.yearJumpIndex([],2017),-1);
assert.equal(years.yearJumpIndex([...trips].reverse(),2017,true),1);
assert.equal(years.yearAtPosition(0,324,2014,2026),2014);
assert.equal(years.yearAtPosition(999,324,2014,2026),2026);
assert.equal(years.yearAtPosition(87,324,2014,2026),2017);
assert.equal(years.yearAtPosition(100,324,2026,2026),2026);
assert.equal(years.visitYear({date:'invalid'}),null);
let index=0,slots=[],effects=[]; const timers=new Map(); let timer=0;
const hooks={
 useState(v){const i=index++;if(!(i in slots))slots[i]=v;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
 useRef(v){const i=index++;slots[i]??={current:v};return slots[i];},useMemo:fn=>fn(),
 useEffect(fn,deps){const i=index++;if(!slots[i]||deps.some((d,n)=>d!==slots[i].deps[n])){const prev=slots[i];slots[i]={deps};effects.push(()=>{prev?.cleanup?.();slots[i].cleanup=fn();});}},
};
const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(v=>v!==false&&v!=null)})};
const names=['View','Text','TextInput','Pressable','FlatList','RefreshControl','ActivityIndicator','AddVisitButton','AddPlaceModal','PlaceListItem','TripDetailsModal','WishlistModal','VisitYearTimeline'];
const mocks={...hooks,...years,React,...Object.fromEntries(names.map(n=>[n,n])),theme:{},StyleSheet:{create:v=>v},
 AccessibilityInfo:{announceForAccessibility(){}},Alert:{alert(){}},countryForTrip:t=>({code:t.countryCode}),displayVisitDate:t=>t.date,
 compareTripsNewest:(a,b)=>b.date.localeCompare(a.date),useTrips:()=>({trips,loading:false,refreshing:false}),
 setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id)};
globalThis.yearMocks=mocks;
async function component(path){const src=(await read(path)).replace(/^import[\s\S]*?from ['"][^'"]+['"];\n/gm,'');
 const code=transformSync(src,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx']}).code;
 return (await load(`const {${Object.keys(mocks).filter(name => !src.includes('function '+name+'(')).join(',')}}=globalThis.yearMocks;\n`+code)).default;}
const Screen=await component('app/screens/TripsScreen.js'); let params={};
const render=(Component=Screen,props={route:{params},navigation:{setParams:next=>Object.assign(params,next)}})=>{index=0;const tree=Component(props);const pending=effects;effects=[];pending.forEach(fn=>fn());return tree;};
const nodes=t=>!t||typeof t!=='object'?[]:[t,...(t.children||[]).flatMap(nodes)];
const find=(t,type)=>nodes(t).find(n=>n.type===type);
let tree=render(); tree=render();let list=find(tree,'FlatList');const scroll=[];
list.props.ref.current={scrollToIndex:v=>scroll.push(v),scrollToOffset:v=>scroll.push(v)};
const axis=find(list.props.ListHeaderComponent,'VisitYearTimeline');axis.props.onSelect(2017);
tree=render();for(const [id,fn]of [...timers]){timers.delete(id);fn();}
assert.equal(scroll.at(-1).index,1);
assert.equal(find(tree,'FlatList').props.data.length,4,'Jump must not filter other years');
find(tree,'FlatList').props.onScrollToIndexFailed({index:1,averageItemLength:200});
assert.equal(scroll.at(-1).offset,200);
find(tree,'FlatList').props.onScrollBeginDrag();assert.equal(timers.size,0,'User scroll cancels pending automatic retries');
params={section:'dreams',sectionRequest:1};render();tree=render();assert.equal(find(tree,'WishlistModal').props.embedded,true);
assert.equal(find(tree,'FlatList'),undefined);
params={section:'visits',sectionRequest:2};render();tree=render();assert.equal(find(tree,'FlatList').props.data.length,4);
// Actual custom slider: live finger feedback, commit only on release.
slots=[];effects=[];const Timeline=await component('app/components/VisitYearTimeline.js'); const commits=[],drag=[];
const props={min:2014,max:2026,value:2026,onSelect:v=>commits.push(v),onDragging:v=>drag.push(v)};
tree=render(Timeline,props);nodes(tree).find(n=>n.props.onLayout).props.onLayout({nativeEvent:{layout:{width:324}}});tree=render(Timeline,props);
let control=nodes(tree).find(n=>n.props.accessibilityRole==='adjustable');
control.props.onResponderGrant({nativeEvent:{pageX:112,locationX:12}});tree=render(Timeline,props);
control=nodes(tree).find(n=>n.props.accessibilityRole==='adjustable');control.props.onResponderMove({nativeEvent:{pageX:187}});tree=render(Timeline,props);
control=nodes(tree).find(n=>n.props.accessibilityRole==='adjustable');assert.equal(control.props.accessibilityValue.now,2017);assert.equal(commits.length,0);
control.props.onResponderRelease();assert.deepEqual(commits,[2017]);assert.equal(drag.at(-1),false);
console.log('PASS: date-based year range, gaps, whole-list jumps, unmeasured-row retry/cancellation, embedded dreams navigation and live finger feedback.');
