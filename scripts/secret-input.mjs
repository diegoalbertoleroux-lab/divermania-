// Keep the terminal in hidden-input mode until a nonempty token is submitted.
// Blank Enter presses can remain after pasting a multi-line block into Cloud Shell.
export function readSecret(label,{input=process.stdin,output=process.stdout,normalize=value=>value.trim(),invalidMessage='La entrada no tiene el formato de un token.'}={}){
  if(!input.isTTY||typeof input.setRawMode!=='function')return Promise.reject(new Error('Abre una terminal interactiva de Cloud Shell para introducir el token de forma oculta.'));
  return new Promise((resolve,reject)=>{
    const wasRaw=!!input.isRaw;let value='',escape=0,sequence='',pasting=false,overflow=false,finished=false;
    const write=text=>output.write(text);
    function cleanup(){input.off('data',receive);input.off('end',ended);input.off('error',failed);input.setRawMode(wasRaw);input.pause();write('\u001b[?2004l\n');}
    function finish(error,result){if(finished)return;finished=true;cleanup();if(error)reject(error);else resolve(result);}
    function ended(){finish(new Error('La entrada se cerró antes de recibir el token.'));}
    function failed(){finish(new Error('No se pudo leer el token desde esta terminal.'));}
    function receive(chunk){
      for(const char of chunk.toString()){
        if(char==='\u001b'){escape=1;sequence='';continue;}
        if(escape===1){escape=char==='['?2:0;continue;}
        if(escape===2){sequence+=char;if(/[@-~]/.test(char)){if(sequence==='200~')pasting=true;if(sequence==='201~')pasting=false;escape=0;}continue;}
        if(char==='\u0003'){finish(new Error('Operación cancelada.'));return;}
        if(char==='\u0004'){ended();return;}
        if(char==='\r'||char==='\n'){
          if(pasting)continue;
          let token;try{token=normalize(value);}catch{token=null;}
          if(!overflow&&/^[A-Za-z0-9._~-]{20,512}$/.test(token)){finish(null,token);return;}
          const hadInput=value.trim().length>0;
          value='';overflow=false;
          write('\n'+(hadInput?invalidMessage:'Todavía no se ha pegado el token.')+' Pégalo aquí y pulsa Enter.\n'+label);
          continue;
        }
        if(char==='\u007f'||char==='\b'){value=value.slice(0,-1);continue;}
        if(char==='\u0015'){value='';overflow=false;continue;}
        if(char>=' '){if(value.length<512)value+=char;else overflow=true;}
      }
    }
    input.setRawMode(true);input.on('data',receive);input.on('end',ended);input.on('error',failed);
    write('\u001b[?2004h'+label);input.resume();
  });
}
