// import buffer from "buffer";
import { infoHash } from "./torrent-parser.js";
import { genId } from "./util.js";
// const Buffer = buffer.Buffer;
const buildHandshake = (torrent) => {
  console.log("Building Handshake message");
  const buf = Buffer.alloc(68);
  buf.writeUInt8(19, 0);
  buf.write("BitTorrent protocol", 1);
  buf.writeUInt32BE(0, 20);
  buf.writeUInt32BE(0, 24);

  infoHash(torrent).copy(buf, 28);
  // console.log(genId());
  // buf.write(genId(), 49);
  genId().copy(buf, 49);
  console.log("Handshake message completed");
  return buf;
};

const buildKeepAlive = () => Buffer.alloc(4);

const buildChoke = () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt32BE(1, 0);
  buf.writeUint8(1, 4);
  return buf;
};

const buildUnchoke = () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt32BE(1, 0);
  buf.writeUInt8(1, 4);
  return buf;
};
const buildInterested = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(2, 4);
  console.log("buildInterested");
  return buf;
};

const buildNotInterested = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(3, 4);
  return buf;
};

const buildHave = (index) => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(5, 0);
  // id
  buf.writeUInt8(4, 4);
  // piece index
  buf.writeUInt32BE(index, 5);
  return buf;
};

const bitField = (bit, payload) => {
  const buf = Buffer.alloc(14);
  buf.writeUInt32BE(payload.length, 0);
  buf.writeUInt8(5, 4);
  bit.copy(buf, 5);
  return buf;
};

const buildRequest = (index, begin, length) => {
  const buf = Buffer.alloc(17);
  buf.writeUInt32BE(13, 0);
  buf.writeUInt8(6, 4);
  buf.writeUInt32BE(index, 5);
  buf.writeUInt32BE(begin, 9);
  buf.writeUInt32BE(length, 13);
  return buf;
};

const buildPiece = (payload) => {
  const buf = Buffer.alloc(payload.block.length + 13);
  // length
  buf.writeUInt32BE(payload.block.length + 9, 0);
  // id
  buf.writeUInt8(7, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // block
  payload.block.copy(buf, 13);
  return buf;
};

const buildCancel = (payload) => {
  const buf = Buffer.alloc(17);
  // length
  buf.writeUInt32BE(13, 0);
  // id
  buf.writeUInt8(8, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // length
  buf.writeUInt32BE(payload.length, 13);
  return buf;
};

const buildPort = () => {
  const buf = Buffer.alloc(7);
  // length
  buf.writeUInt32BE(3, 0);
  // id
  buf.writeUInt8(9, 4);
  // listen-port
  buf.writeUInt16BE(payload, 5);
  return buf;
};

const parse = (msg) => {
  // first 4 bytes have the length of the message
  const id = msg.length > 4 ? msg.readInt8(4) : null; //id of the message = read one byte after 4 bytes;
  let payload = msg.length > 5 ? msg.slice(5) : null; // payload of the message
  if (id === 6 || id === 7 || id === 8) {
    const rest = payload.slice(8);
    payload = {
      index: payload,
      begin: payload,
    };
    payload[id === 7 ? "block" : "length"] = rest;
  }
  return {
    size: msg.readInt32BE(0),
    id: id,
    payload: payload,
  };
};

export {
  buildHandshake,
  buildKeepAlive,
  buildChoke,
  buildUnchoke,
  buildHave,
  buildInterested,
  buildNotInterested,
  buildRequest,
  buildPiece,
  buildCancel,
  buildPort,
  bitField,
  parse,
};
