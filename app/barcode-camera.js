import {BrowserMultiFormatReader} from '@zxing/browser';
export async function startCamera(video,onCode){const reader=new BrowserMultiFormatReader();return reader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}},audio:false},video,(result,error,controls)=>{if(result){controls.stop();onCode(result.getText());}});}
