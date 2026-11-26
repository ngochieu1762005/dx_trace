/* DX-TRACE | Bounded, non-extracting archive codec for the Evidence v1 profile.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {gzipSync, gunzipSync} from 'node:zlib';

export const EVIDENCE_FILES = Object.freeze([
  'manifest.json', 'decision.json', 'events.jsonl', 'policy.json',
  'workflow.bpmn', 'data-lineage.json', 'proof.json', 'signature.sig'
]);
export const EVIDENCE_LIMITS = Object.freeze({
  archiveBytes: 16 * 1024 * 1024,
  expandedBytes: 32 * 1024 * 1024,
  fileBytes: 12 * 1024 * 1024,
  events: 100000
});
const BLOCK = 512;
const invalid = message => { throw new Error('Invalid evidence archive: ' + message); };
const zero = buffer => buffer.every(byte => byte === 0);

function octal(value, width) {
  const text = value.toString(8);
  if (text.length >= width) invalid('numeric field overflow');
  return text.padStart(width - 1, '0') + '\0';
}

/** Write only the eight fixed regular files. No shell, extraction or paths involved. */
export function packEvidenceFiles(files) {
  if (!files || Object.keys(files).length !== EVIDENCE_FILES.length ||
      EVIDENCE_FILES.some(name => !Object.hasOwn(files, name))) invalid('unexpected file set');
  const blocks = [];
  let expanded = 2 * BLOCK;
  for (const name of EVIDENCE_FILES) {
    const value = files[name];
    if (!Buffer.isBuffer(value) && typeof value !== 'string') invalid('invalid file bytes');
    const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
    if (data.length > EVIDENCE_LIMITS.fileBytes) invalid('file exceeds limit');
    expanded += BLOCK + Math.ceil(data.length / BLOCK) * BLOCK;
    if (expanded > EVIDENCE_LIMITS.expandedBytes) invalid('expanded size exceeds limit');
    const header = Buffer.alloc(BLOCK);
    header.write(name, 0, 100, 'ascii');
    header.write(octal(0o600, 8), 100, 8, 'ascii');
    header.write(octal(0, 8), 108, 8, 'ascii');
    header.write(octal(0, 8), 116, 8, 'ascii');
    header.write(octal(data.length, 12), 124, 12, 'ascii');
    header.write(octal(0, 12), 136, 12, 'ascii');
    header.fill(32, 148, 156);
    header[156] = 48; // POSIX regular file; links and extension records are forbidden.
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    blocks.push(header, data, Buffer.alloc((BLOCK - data.length % BLOCK) % BLOCK));
  }
  blocks.push(Buffer.alloc(2 * BLOCK));
  const archive = gzipSync(Buffer.concat(blocks), {level: 9});
  if (archive.length > EVIDENCE_LIMITS.archiveBytes) invalid('compressed size exceeds limit');
  return archive;
}

function textField(header, start, length) {
  const bytes = header.subarray(start, start + length);
  const end = bytes.indexOf(0);
  const value = end < 0 ? bytes : bytes.subarray(0, end);
  if (end >= 0 && !zero(bytes.subarray(end))) invalid('nonzero string field padding');
  if (value.some(byte => byte < 32 || byte > 126)) invalid('non-ASCII header');
  return value.toString('ascii');
}

function numberField(header, start, length) {
  const value = header.subarray(start, start + length).toString('latin1');
  if (!/^[0-7]+[\0 ]*$/.test(value)) invalid('non-octal numeric field');
  const number = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(number) || number < 0) invalid('numeric field overflow');
  return number;
}

/** A deliberately strict ustar profile: rejects links, PAX, paths and duplicate names. */
export function unpackEvidenceFiles(input) {
  if (!(input instanceof Uint8Array) || !input.length || input.length > EVIDENCE_LIMITS.archiveBytes)
    invalid('compressed size exceeds limit or empty input');
  const compressed = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (compressed[0] !== 0x1f || compressed[1] !== 0x8b) invalid('gzip required');
  let tar;
  try { tar = gunzipSync(compressed, {maxOutputLength: EVIDENCE_LIMITS.expandedBytes}); }
  catch { invalid('gzip checksum, truncation or expanded size limit'); }
  if (tar.length % BLOCK) invalid('truncated tar block');
  const files = Object.create(null);
  let offset = 0, ended = false;
  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (zero(header)) {
      if (offset + 2 * BLOCK > tar.length || !zero(tar.subarray(offset))) invalid('invalid tar terminator');
      ended = true;
      break;
    }
    if (Object.keys(files).length >= EVIDENCE_FILES.length) invalid('too many entries');
    const expected = numberField(header, 148, 8);
    const checksum = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
    if (checksum !== expected) invalid('tar header checksum mismatch');
    if (header.subarray(257, 263).toString('latin1') !== 'ustar\0' ||
        header.subarray(263, 265).toString('ascii') !== '00') invalid('ustar format required');
    if (header[156] !== 48 && header[156] !== 0) invalid('only regular files are accepted');
    if (!zero(header.subarray(157, 257)) || !zero(header.subarray(345, 500))) invalid('links and path prefixes are forbidden');
    const name = textField(header, 0, 100);
    if (!EVIDENCE_FILES.includes(name) || Object.hasOwn(files, name)) invalid('unexpected path or duplicate file');
    const size = numberField(header, 124, 12);
    if (size > EVIDENCE_LIMITS.fileBytes) invalid('file exceeds limit');
    const start = offset + BLOCK, end = start + size;
    const next = start + Math.ceil(size / BLOCK) * BLOCK;
    if (next > tar.length) invalid('truncated file');
    if (!zero(tar.subarray(end, next))) invalid('nonzero data padding');
    files[name] = Buffer.from(tar.subarray(start, end));
    offset = next;
  }
  if (!ended || EVIDENCE_FILES.some(name => !Object.hasOwn(files, name))) invalid('missing files or terminator');
  return files;
}
