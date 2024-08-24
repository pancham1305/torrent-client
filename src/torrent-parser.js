import fs from "fs";
import crypto from "crypto";
import bencode from "bencode";

const open = (filePath) => {
  const torrent = bencode.decode(fs.readFileSync(filePath));
  return torrent;
};
const size = (torrent) => {
  const decoder = new TextDecoder();
  const files = torrent.info.files
    ? torrent.info.files.map((file) => file.length).reduce((a, b) => a + b)
    : BigInt(torrent.info.length);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(files));
  return buffer;
};
const infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};

const BLOCK_LEN = Math.pow(2, 14);

const pieceLen = (torrent, pieceIndex) => {
  const buf = Buffer.alloc(8);
  size(torrent).copy(buf, 0);
  const totalLen = BigInt(buf.readBigInt64BE());
  const pieceLength = BigInt(torrent.info["piece length"]);
  const lastpieceLength = totalLen % pieceLength;
  const lastpieceIndex = totalLen / pieceLength;
  return lastpieceIndex === pieceIndex ? lastpieceLength : pieceLength;
};

const blocksperPiece = (torrent, pieceIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);
  return pieceLength / BigInt(BLOCK_LEN);
};

const blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);
  const lastpieceIndex = pieceLength / BigInt(BLOCK_LEN);
  const lastpieceLength = pieceLength % BigInt(BLOCK_LEN);
  return blockIndex === lastpieceIndex ? lastpieceLength : BLOCK_LEN;
};

export { size, infoHash, open, pieceLen, blocksperPiece, blockLen, BLOCK_LEN };
