const fs=require('fs'),path=require('path'),vm=require('vm');
const base=process.cwd();
const {TraceMap,originalPositionFor}=require(path.join(base,'node_modules/@jridgewell/trace-mapping'));
const dir=process.argv[2]; if (!dir) throw Error('Pass the Android export bundle directory'); const name=fs.readdirSync(dir).find(x=>x.endsWith('.js'));
let src=fs.readFileSync(path.join(dir,name),'utf8');
const map=new TraceMap(JSON.parse(fs.readFileSync(path.join(dir,name+'.map'))));
const ids={};
const parser=require(path.join(base,'node_modules/@babel/parser'));
const ast=parser.parse(src);
const {eachMapping}=require(path.join(base,'node_modules/@jridgewell/trace-mapping'));
const locations={};
eachMapping(map,m=>{
 if(m.source?.includes('/node_modules/firebase/app/dist/'))locations.app ??= m.generatedLine;
 if(m.source?.includes('/node_modules/firebase/auth/dist/'))locations.auth ??= m.generatedLine;
});
for(const n of ast.program.body){
 const e=n.expression;
 if(e?.callee?.name!=='__d')continue;
 for(const [key,line] of Object.entries(locations))if(n.loc.start.line<=line&&n.loc.end.line>=line)ids[key]=e.arguments[1].value;
}
if(!Number.isInteger(ids.app)||!Number.isInteger(ids.auth))throw Error('Could not locate Firebase modules');
src=src.replace(/^__r\(\d+\);$/gm,'');
const sandbox={console,setTimeout,clearTimeout,setInterval,clearInterval,URL,URLSearchParams,TextEncoder,TextDecoder,fetch,Headers,Request,Response,AbortController,structuredClone};
sandbox.global=sandbox; sandbox.window=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox); vm.runInContext(src,sandbox);
const app=sandbox.__r(ids.app), auth=sandbox.__r(ids.auth);
const storage=new Map();
const adapter={getItem:async k=>storage.get(k)||null,setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k)};
(async()=>{
const instance=app.initializeApp({apiKey:'fake-api-key',projectId:'offline-smoke',appId:'1:123:web:abc'},'offline-smoke');
const account=auth.initializeAuth(instance,{persistence:auth.getReactNativePersistence(adapter)});
await account.authStateReady();
if(account.currentUser!==null)throw Error('Unexpected user');
await auth.signOut(account);
await app.deleteApp(instance);
console.log('PASS: actual Metro Android bundle initializes React Native Firebase Auth, restores empty persistence and signs out without network or credentials.');
})().catch(e=>{console.error(e);process.exitCode=1});
