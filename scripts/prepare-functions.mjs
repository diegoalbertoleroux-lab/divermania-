import {copyFile} from 'node:fs/promises';
for(const file of ['domain.js','settings.js','codec.js','catalog.js'])await copyFile('shared/'+file,'functions/'+file);
console.log('Dominio compartido preparado para Firebase Functions.');
