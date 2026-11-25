export class ValidationError extends Error {}
export function validateState(s) {
 const fail=m=>{throw new ValidationError(m)};
 const str=(v,max)=>typeof v==='string'&&v.length<=max;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!s||typeof s!=='object'||!Array.isArray(s.invoices)||s.invoices.length>2000||!s.months||typeof s.months!=='object'||Array.isArray(s.months))fail('Estructura de seguimiento no válida.');
 const seen=new Set(),ids=new Set();
 for(const i of s.invoices){
  if(!i||!str(i.id,100)||!i.id||ids.has(i.id))fail('Identificador de comprobante no válido o repetido.');ids.add(i.id);
  if(!str(i.number,60)||!i.number.trim()||!str(i.issuer,150)||!i.issuer.trim()||!/^\d{11}$/.test(i.cuit))fail('Revisá proveedor, CUIT y número completo.');
  if(!date(i.date)||!i.date.startsWith('2026-')||!Number.isInteger(i.month)||i.month<0||i.month>11)fail('Fecha o mes fuera del período 2026.');
  if(!Number.isSafeInteger(i.amount)||i.amount<=0||i.amount>=100000000000)fail('Importe no válido.');
  if(!['Familiar 1','Familiar 2','Ambos / revisar'].includes(i.child)||!['Factura','Nota de crédito','Recibo','Otro'].includes(i.type)||!['Pendiente','Revisado','Cargado en borrador','Presentado'].includes(i.status))fail('Tipo, familiar o estado no válido.');
  const duplicate=i.cuit+'|'+i.type+'|'+i.number.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(seen.has(duplicate))fail('Comprobante duplicado: CUIT, tipo y número completo coinciden.');seen.add(duplicate);
 }
 for(const [k,m]of Object.entries(s.months)){
  if(!/^([0-9]|10|11)$/.test(k)||!m||!['Por revisar','Documentación reunida','Conciliado','Borrador preparado','Presentación registrada'].includes(m.status)||!str(m.notes,2000)||!str(m.sent,10)||!str(m.read,10))fail('Seguimiento mensual no válido.');
  if((m.sent&&!date(m.sent))||(m.read&&!date(m.read)))fail('Fecha de envío o lectura no válida.');
  if(m.read&&(!m.sent||m.read<m.sent))fail('La lectura debe ser posterior o igual al envío.');
  if(m.status==='Presentación registrada'&&!m.sent)fail('La presentación requiere fecha de envío.');
 }
 // Whitelist fields so imports cannot persist unrelated fields or credentials.
 return {invoices:s.invoices.map(({id,date,month,issuer,cuit,type,number,amount,child,status})=>({id,date,month,issuer,cuit,type,number,amount,child,status})),months:Object.fromEntries(Object.entries(s.months).map(([k,{status,notes,sent,read}])=>[k,{status,notes,sent,read}]))};
}
