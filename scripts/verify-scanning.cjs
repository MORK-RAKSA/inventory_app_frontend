const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();
function load(name){const file=path.resolve(__dirname,'../src',name+'.ts');if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);new Function('exports','module','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports,m,id=>load(id.replace('./','')));return m.exports;}
const {acceptCameraRead}=load('scannerRead'),{createScanGate}=load('scanGate'),{insideFrame}=load('scannerAcceptance'),{validateBarcodeRead}=load('barcodeScannerValidation');
const gate=createScanGate(),pending={code:'',n:0,at:0};
assert.equal(acceptCameraRead(gate,pending,'4006381333931','ean13',1000),'4006381333931');
for(let time=1100;time<3000;time+=100)assert.equal(acceptCameraRead(gate,pending,'4006381333931','ean13',time),null);
assert.equal(acceptCameraRead(gate,pending,'4006381333931','ean13',4000),'4006381333931');
assert.equal(acceptCameraRead(gate,pending,'4006381333932','ean13',4100),null);
const custom=createScanGate();
assert.equal(acceptCameraRead(custom,pending,'ITEM-A','code128',5000),null);
assert.equal(acceptCameraRead(custom,pending,'ITEM-A','code128',5020),null);
assert.equal(acceptCameraRead(custom,pending,'ITEM-A','code128',5060),'ITEM-A');
assert.equal(acceptCameraRead(custom,pending,'ITEM-A','code128',5100),null);
const upce=validateBarcodeRead('04210007','upce');assert.equal(upce.ok,true);assert.equal(upce.code,'042000001007');
assert.equal(insideFrame(undefined,{x:26,y:34,width:300,height:164}),false);
assert.equal(insideFrame({origin:{x:30,y:50},size:{width:100,height:50}},{x:26,y:34,width:300,height:164}),true);
assert.equal(insideFrame({origin:{x:20,y:50},size:{width:100,height:50}},{x:26,y:34,width:300,height:164}),false);
console.log('Scanning: first-read acceptance, duplicate hold/re-entry, checksum rejection, custom confirmation, UPC-E normalization and frame checks passed.');
