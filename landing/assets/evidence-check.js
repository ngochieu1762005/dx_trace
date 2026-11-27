// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 DX-TRACE contributors
const form = document.querySelector('#verify-proof');
const output = document.querySelector('#verification');
const translate = (vi, en) => document.documentElement.lang === 'en' ? en : vi;
const text = new TextDecoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
const names = ['manifest.json','signature.sig','decision.json','events.jsonl','policy.json','workflow.bpmn','data-lineage.json','proof.json'];
async function readArchive(file) {
  if (file.size > 16*1024*1024) throw Error(translate('Gói vượt quá 16 MiB', 'Archive exceeds 16 MiB'));
  const chunks = [];
  let length = 0;
  for await (const chunk of file.stream().pipeThrough(new DecompressionStream('gzip'))) {
    length += chunk.length;
    if (length > 32*1024*1024) throw Error(translate('Dữ liệu giải nén vượt quá 32 MiB', 'Expanded archive exceeds 32 MiB'));
    chunks.push(chunk);
  }
  const tar = new Uint8Array(await new Blob(chunks).arrayBuffer());
  const files = new Map();
  let offset = 0;
  while (offset+512 <= tar.length && tar[offset]) {
    const header = tar.subarray(offset,offset+512);
    const field=(a,b)=>text.decode(header.subarray(a,b)).replace(/\0.*$/s,'').trim();
    const name=field(0,100), size=Number.parseInt(field(124,136),8);
    if (!names.includes(name)||files.has(name)||header[156]!==48||field(257,263)!=='ustar'||
        !/^[0-7]+$/.test(field(124,136))||size>12*1024*1024||offset+512+size>tar.length)
      throw Error(translate('Mục trong gói không hợp lệ', 'Invalid archive entry'));
    files.set(name,tar.slice(offset+512,offset+512+size));
    offset+=512+Math.ceil(size/512)*512;
  }
  if(files.size!==names.length||tar.length-offset<1024||tar.subarray(offset).some(b=>b!==0))throw Error(translate('Gói thiếu tệp hoặc sai cấu trúc', 'Incomplete or malformed archive'));
  return files;
}
async function verify(archive, keyFile, modifySample = false) {
  if(keyFile.size>16384)throw Error(translate('Khóa công khai không hợp lệ', 'Invalid public key'));
  const pem=(await keyFile.text()).trim();
  const body=/^-----BEGIN PUBLIC KEY-----\s+([A-Za-z0-9+/=\s]+)-----END PUBLIC KEY-----$/.exec(pem);
  if(!body)throw Error(translate('Cần khóa công khai SPKI dạng PEM', 'Expected an SPKI public key in PEM format'));
  const key=await crypto.subtle.importKey('spki',Uint8Array.from(atob(body[1]),c=>c.charCodeAt(0)),{name:'Ed25519'},false,['verify']);
  const files=await readArchive(archive);
  if (modifySample) {
    const decision = JSON.parse(text.decode(files.get('decision.json')));
    decision.transition.after = 'released';
    files.set('decision.json', new TextEncoder().encode(JSON.stringify(decision)));
  }
  const manifest=files.get('manifest.json');
  const signed=await new Blob(['DX-TRACE Business Decision Proof v1\n',manifest]).arrayBuffer();
  if(!await crypto.subtle.verify('Ed25519',key,files.get('signature.sig'),signed))throw Error(translate('Chữ ký không hợp lệ', 'Invalid signature'));
  const info=JSON.parse(text.decode(manifest));
  if(info.schema!=='dxtrace.business-decision-proof.v1'||Object.keys(info.files).length!==6)throw Error(translate('Bản kê không hợp lệ', 'Invalid manifest'));
  for(const name of names.slice(2)){
    const item=files.get(name), expected=info.files[name];
    if(expected?.bytes!==item.length||expected.sha256!==hex(await crypto.subtle.digest('SHA-256',item)))throw Error(translate('Tệp sai kích thước hoặc mã băm: ', 'Size or hash mismatch: ')+name);
  }
  return translate('✓ Gói hợp lệ', '✓ Valid archive') + ' · Ed25519 · 6/6 SHA-256 · ' + info.decisionId;
}

function showError(error) {
  const fallback = translate('Kiểm tra định dạng gói và khóa công khai.', 'Check the archive format and public key.');
  return '✗ ' + (error.constructor === Error ? error.message : fallback);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    output.textContent = await verify(form.elements.archive.files[0], form.elements.publicKey.files[0]);
  } catch (error) {
    output.textContent = showError(error);
  } finally {
    button.disabled = false;
  }
});

const original = document.querySelector('#sample-check');
const modified = document.querySelector('#sample-change');
const sampleResult = document.querySelector('#sample-result');
async function loadSample(name) {
  const response = await fetch('/assets/samples/v0.2.0/' + name);
  if (!response.ok) throw Error(translate('Không tải được gói mẫu.', 'Could not load the sample.'));
  return response.blob();
}
async function checkSample(change) {
  original.disabled = modified.disabled = true;
  sampleResult.textContent = translate('Đang kiểm tra…', 'Verifying…');
  try {
    const [archive, key] = await Promise.all([
      loadSample('synthetic-recall-evidence.tar.gz'), loadSample('public-key.pub')
    ]);
    sampleResult.textContent = await verify(archive, key, change);
    modified.disabled = false;
  } catch (error) {
    sampleResult.textContent = showError(error);
  } finally {
    original.disabled = false;
  }
}
original.addEventListener('click', () => checkSample(false));
modified.addEventListener('click', () => checkSample(true));
