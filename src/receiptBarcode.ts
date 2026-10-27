/** Code 39 receipt reference, including start/stop symbols and quiet zones. */
export function receiptBarcode(id: string) {
 const patterns: Record<string, number> = { '0':0x034,'1':0x121,'2':0x061,'3':0x160,'4':0x031,'5':0x130,'6':0x070,'7':0x025,'8':0x124,'9':0x064,A:0x109,B:0x049,C:0x148,D:0x019,E:0x118,F:0x058,'*':0x094 };
 const value=id.replace(/-/g,'').slice(0,8).toUpperCase();
 let x=12; const bars:string[]=[];
 for(const c of '*'+value+'*') {
  const pattern=patterns[c]; if(pattern===undefined) return '';
  for(let i=0;i<9;i++){const w=pattern & (1<<(8-i)) ? 3 : 1; if(i%2===0)bars.push(`<rect x="${x}" y="0" width="${w}" height="44"/>`);x+=w;}
  x+=1;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x+12} 44" width="100%" height="44"><rect width="100%" height="44" fill="white"/><g fill="black">${bars.join('')}</g></svg>`;
}
export const receiptTime = (date: string) => new Date(date).toLocaleString('en-GB',{timeZone:'Asia/Phnom_Penh',hour12:false});
