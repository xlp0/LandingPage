/**
 * penpot-zip.mjs
 * Sprint CDO-15: Zero-dependency ZIP read/write utility for .penpot archives.
 * Built with Node.js built-ins (node:fs, node:zlib, node:crypto) (INV-REF-01).
 */

import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import * as crypto from 'node:crypto';

export function sha256(data) {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(data)) {
    hash.update(data);
  } else if (typeof data === 'string') {
    hash.update(data, 'utf8');
  } else {
    hash.update(deterministicStringify(data), 'utf8');
  }
  return hash.digest('hex');
}

export function deterministicStringify(val) {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(item => deterministicStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  const pairs = keys.map(k => JSON.stringify(k) + ':' + deterministicStringify(val[k]));
  return '{' + pairs.join(',') + '}';
}

/**
 * Reads and extracts all entries from a ZIP / .penpot archive buffer.
 * Throws a clear error if the archive is corrupt or malformed (INV-CDO-08).
 * @param {Buffer} buf 
 * @returns {{ entries: Map<string, Buffer>, getJson: (path: string) => any, list: () => string[] }}
 */
export function readZip(buf) {
  if (!Buffer.isBuffer(buf)) {
    throw new Error('MALFORMED_ARCHIVE: Expected Buffer input (INV-CDO-08)');
  }
  if (buf.length < 22) {
    throw new Error('MALFORMED_ARCHIVE: Archive file too small to be a valid ZIP (INV-CDO-08)');
  }

  const eocdSig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const idx = buf.lastIndexOf(eocdSig);
  if (idx === -1) {
    throw new Error('MALFORMED_ARCHIVE: End-of-central-directory signature not found (INV-CDO-08)');
  }

  const cdCount = buf.readUInt16LE(idx + 10);
  const cdSize = buf.readUInt32LE(idx + 12);
  const cdOffset = buf.readUInt32LE(idx + 16);

  if (cdOffset + cdSize > buf.length) {
    throw new Error('MALFORMED_ARCHIVE: Central directory out of bounds (INV-CDO-08)');
  }

  let pos = cdOffset;
  const entries = new Map();

  for (let i = 0; i < cdCount; i++) {
    if (pos + 46 > buf.length) {
      throw new Error(`MALFORMED_ARCHIVE: Truncated central directory entry ${i} (INV-CDO-08)`);
    }
    const sig = buf.readUInt32LE(pos);
    if (sig !== 0x02014b50) {
      throw new Error(`MALFORMED_ARCHIVE: Corrupt central directory entry signature at offset ${pos} (INV-CDO-08)`);
    }

    const method = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const uncompSize = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commLen = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);

    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen);
    pos += 46 + nameLen + extraLen + commLen;

    if (localOffset + 30 > buf.length) {
      throw new Error(`MALFORMED_ARCHIVE: Local file header out of bounds for ${name} (INV-CDO-08)`);
    }

    const localSig = buf.readUInt32LE(localOffset);
    if (localSig !== 0x04034b50) {
      throw new Error(`MALFORMED_ARCHIVE: Corrupt local file header signature for ${name} (INV-CDO-08)`);
    }

    const locNameLen = buf.readUInt16LE(localOffset + 26);
    const locExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + locNameLen + locExtraLen;

    if (dataStart + compSize > buf.length) {
      throw new Error(`MALFORMED_ARCHIVE: Compressed payload out of bounds for ${name} (INV-CDO-08)`);
    }

    const rawData = buf.subarray(dataStart, dataStart + compSize);
    let data;
    try {
      if (method === 0) {
        data = rawData;
      } else if (method === 8) {
        data = zlib.inflateRawSync(rawData);
      } else {
        throw new Error(`Unsupported compression method ${method}`);
      }
    } catch (err) {
      throw new Error(`MALFORMED_ARCHIVE: Decompression failed for entry ${name}: ${err.message} (INV-CDO-08)`);
    }

    entries.set(name, data);
  }

  return {
    entries,
    list: () => Array.from(entries.keys()).sort(),
    getJson: (entryPath) => {
      const b = entries.get(entryPath);
      if (!b) return null;
      try {
        return JSON.parse(b.toString('utf8'));
      } catch (err) {
        throw new Error(`MALFORMED_ARCHIVE: Invalid JSON in entry ${entryPath}: ${err.message} (INV-CDO-08)`);
      }
    },
    getBuffer: (entryPath) => entries.get(entryPath) || null,
  };
}

/**
 * Creates a deterministic ZIP / .penpot archive buffer from entries.
 * Keys are sorted for deterministic output (INV-CDO-13).
 * @param {Record<string, string | Buffer | object>} entriesRecord 
 * @returns {Buffer}
 */
export function writeZip(entriesRecord) {
  const localChunks = [];
  const cdChunks = [];
  let offset = 0;

  const names = Object.keys(entriesRecord).sort();

  for (const name of names) {
    let content = entriesRecord[name];
    let dataBuf;
    if (Buffer.isBuffer(content)) {
      dataBuf = content;
    } else if (typeof content === 'string') {
      dataBuf = Buffer.from(content, 'utf8');
    } else if (content !== null && typeof content === 'object') {
      dataBuf = Buffer.from(JSON.stringify(content, null, 2), 'utf8');
    } else {
      dataBuf = Buffer.from(String(content), 'utf8');
    }

    const nameBuf = Buffer.from(name, 'utf8');
    const compBuf = zlib.deflateRawSync(dataBuf);
    const crc = zlib.crc32(dataBuf);

    // Local file header (30 bytes)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); // Local header signature
    lh.writeUInt16LE(20, 4);         // Version needed: 2.0
    lh.writeUInt16LE(0, 6);          // General purpose bit flag
    lh.writeUInt16LE(8, 8);          // Compression method: 8 (deflate)
    lh.writeUInt16LE(0, 10);         // Last mod file time (zeroed for determinism)
    lh.writeUInt16LE(0x5000, 12);     // Last mod file date (static for determinism)
    lh.writeUInt32LE(crc, 14);       // CRC-32
    lh.writeUInt32LE(compBuf.length, 18);  // Compressed size
    lh.writeUInt32LE(dataBuf.length, 22);  // Uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26);  // File name length
    lh.writeUInt16LE(0, 28);               // Extra field length

    localChunks.push(lh, nameBuf, compBuf);

    // Central directory header (46 bytes)
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0); // Central directory header signature
    cdh.writeUInt16LE(20, 4);         // Version made by: 2.0
    cdh.writeUInt16LE(20, 6);         // Version needed to extract: 2.0
    cdh.writeUInt16LE(0, 8);          // General purpose bit flag
    cdh.writeUInt16LE(8, 10);         // Compression method: 8
    cdh.writeUInt16LE(0, 12);         // File last mod time
    cdh.writeUInt16LE(0x5000, 14);     // File last mod date
    cdh.writeUInt32LE(crc, 16);       // CRC-32
    cdh.writeUInt32LE(compBuf.length, 20);  // Compressed size
    cdh.writeUInt32LE(dataBuf.length, 24);  // Uncompressed size
    cdh.writeUInt16LE(nameBuf.length, 28);  // File name length
    cdh.writeUInt16LE(0, 30);               // Extra field length
    cdh.writeUInt16LE(0, 32);               // File comment length
    cdh.writeUInt16LE(0, 34);               // Disk number start
    cdh.writeUInt16LE(0, 36);               // Internal file attributes
    cdh.writeUInt32LE(0, 38);               // External file attributes
    cdh.writeUInt32LE(offset, 42);          // Relative offset of local header

    cdChunks.push(cdh, nameBuf);
    offset += 30 + nameBuf.length + compBuf.length;
  }

  const cdBuf = Buffer.concat(cdChunks);
  const cdOffset = offset;
  const cdSize = cdBuf.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4);          // Disk number
  eocd.writeUInt16LE(0, 6);          // Start disk
  eocd.writeUInt16LE(names.length, 8);   // Entries on this disk
  eocd.writeUInt16LE(names.length, 10);  // Total entries
  eocd.writeUInt32LE(cdSize, 12);    // Central directory size
  eocd.writeUInt32LE(cdOffset, 16);  // Central directory offset
  eocd.writeUInt16LE(0, 20);         // Comment length

  return Buffer.concat([...localChunks, cdBuf, eocd]);
}
