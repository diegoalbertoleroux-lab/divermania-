import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('functions/shared',{recursive:true});await mkdir('functions/server',{recursive:true});
for(const file of ['domain.js','settings.js','codec.js','catalog.js','presentation.js','finance.js','workspace.js','barcodes.js'])await copyFile('shared/'+file,'functions/shared/'+file);
for(const file of ['control.js','errors.js','workspace.js','barcodes.js','delivery.js','cash-ledger.js'])await copyFile('server/'+file,'functions/server/'+file);
console.log('Adaptador local de Firebase preparado. El despliegue gratuito utiliza Workers.');
