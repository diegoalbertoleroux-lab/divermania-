export function barcodeValue(value){const code=String(value||'').trim();if(!/^[0-9]{8,14}$/.test(code))throw new Error('Usa un código de barras numérico de 8 a 14 dígitos.');return code;}
