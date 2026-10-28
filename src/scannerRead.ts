import { canonicalBarcode } from './barcode';
import { validateBarcodeRead } from './barcodeScannerValidation';
import { confirmRead } from './scannerAcceptance';
import { isDuplicateScan, rememberScan, ScanGate } from './scanGate';
/** One acceptance gate for camera and gun. Frame containment is checked by the viewport caller. */
export function acceptCameraRead(gate:ScanGate,pending:{code:string;n:number;at:number},raw:string,type:string|undefined,now:number):string|null {
 const result=validateBarcodeRead(raw,type,'camera');
 if(!result.ok)return null;
 const code=canonicalBarcode(result.code);
 if(isDuplicateScan(gate,code,now))return null;
 if(!result.checksumVerified&&!confirmRead(pending,code,now))return null;
 rememberScan(gate,code,now);
 pending.code='';pending.n=0;pending.at=0;
 return code;
}
