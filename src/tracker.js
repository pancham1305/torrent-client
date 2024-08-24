// Protocol for connecting to the tracker
// 1. Send the connect request
// 2. get the connect response and extract the connection id
// 3. use the connection id to send the announce request - this is where we tell the tracker which we are Interested in
// 4. get the announce response and extract the peers list

import dgram from "dgram";
import crypto from "crypto";
import { genId } from "./util.js";
import { infoHash } from "./torrent-parser.js";
import buffer from "buffer";
const Buffer = buffer.Buffer;

import url from "url";
import { resolve } from "path";

// converting getPeers to promise

const getPeers = (torrent, callback) => {
  const socket = dgram.createSocket("udp4");
  const decoder = new TextDecoder();
  torrent["announce-list"].forEach((e) => {
    const connReq = buildConnReq();
    let rawUrl = decoder.decode(e[0]);
    let x = udpSend(socket, connReq, rawUrl, callback);
    // console.log(rawUrl);

    socket.on("message", (response) => {
      if (respType(response) === "connect") {
        // Recieve response from tracker and parse it
        const connResp = parseConnResp(response);
        //   Build announce request
        const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
        // send announce request
        udpSend(socket, announceReq, rawUrl);
      } else if (respType(response) === "announce") {
        // Recieve announce response from tracker and parse it
        const announceResp = parseAnnounceResp(response);

        callback(announceResp.peers);
      } else if (respType(response) === "error") {
        // Handle error response
        console.error("Received error from tracker:", parseErrorResp(response));
      }
    });
  });
  // send connection request
};

function udpSend(socket, message, rawUrl, callback = () => {}) {
  let ok = false;
  const link = url.parse(rawUrl);
  if (link.port) {
    socket.send(message, 0, message.length, link.port, link.hostname, (e) => {
      console.log(e);
    });
  }
  return ok;
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  // three is for error
  if (action === 0) {
    return "connect";
  } else if (action === 1) {
    return "announce";
  }
}

function buildConnReq() {
  /*
    Offset  Size            Name            Value
0       64-bit Integer  connection_id   0x41727101980
8       32-bit Integer  action          0 // connect
12      32-bit Integer  transaction_id  ? // random
    */
  const buf = Buffer.alloc(16);
  const connectionId = BigInt("0x41727101980");

  // Extract high and low 32 bits using BigInt operations
  const high = Number(connectionId >> 32n); // Get high 32 bits as a Number
  const low = Number(connectionId & 0xffffffffn); // Get low 32 bits as a Number

  // Write the high and low 32 bits into the buffer as unsigned integers
  buf.writeUInt32BE(high, 0); // Write high 32 bits at offset 0
  buf.writeUInt32BE(low, 4);
  buf.writeUInt32BE(0, 8); // action = 0 (connect)
  crypto.randomBytes(4).copy(buf, 12); // transaction_id
  return buf;
}

function parseConnResp(Resp) {
  /*
    Offset  Size            Name            Value
0       32-bit Integer  action          0 // connect
4       32-bit Integer  transaction_id
8       64-bit Integer  connection_id
    */
  return {
    action: Resp.readInt32BE(0),
    transactionId: Resp.readInt32BE(4),
    connectionId: Resp.slice(8),
  };
}

function buildAnnounceReq(connId, torrent, port = 6881) {
  /*
    Offset  Size    Name    Value
    0       64-bit Integer  connection_id
    8       32-bit Integer  action          1 // announce
    12      32-bit Integer  transaction_id
    16      20-byte string  info_hash
    36      20-byte string  peer_id
    56      64-bit Integer  downloaded
    64      64-bit Integer  left
    72      64-bit Integer  uploaded
    80      32-bit Integer  event           0 // 0: none; 1: completed; 2: started; 3: stopped
    84      32-bit Integer  IP address      0 // default
    88      32-bit Integer  key             ? // random
    92      32-bit Integer  num_want        -1 // default
    96      16-bit Integer  port            ? // should be between 0 and 65535
  */
  const buf = Buffer.alloc(98);
  connId.copy(buf, 0); // 64-bit connection_id
  buf.writeUInt32BE(1, 8); // action = 1 (announce)
  crypto.randomBytes(4).copy(buf, 12); // transaction_id
  // info_hash
  infoHash(torrent).copy(buf, 16);
  // peer_id
  genId().copy(buf, 36);
  Buffer.alloc(8).copy(buf, 56); // downloaded = 0
  Buffer.alloc(8).copy(buf, 64); // left = 0
  Buffer.alloc(8).copy(buf, 72); // uploaded = 0
  buf.writeUInt32BE(0, 80); // event = 0 (none)
  buf.writeUInt32BE(0, 84); // IP address = 0 (default)
  crypto.randomBytes(4).copy(buf, 88); // key
  buf.writeInt32BE(-1, 92); // num_want = -1 (default)
  buf.writeUInt16BE(port, 96); // port

  return buf;
}

function parseAnnounceResp(resp) {
  function group(it, grSize) {
    let grs = [];
    for (let i = 0; i < it.length; i += grSize) {
      grs.push(it.slice(i, i + grSize));
    }
    return grs;
  }
  const decoder = new TextDecoder();
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20), 6).map((address) => {
      return {
        ip: address.slice(0, 4).join("."), // we can call on a buffer. this is a bit fancy as it coerces the bytes into a string but seems to work.
        port: address.readUInt16BE(4),
      };
    }),
  };
}

export { getPeers };
