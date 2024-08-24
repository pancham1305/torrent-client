import net from "net";
import { Buffer } from "buffer";
import { getPeers } from "./tracker.js";
import {
  bitField,
  buildHandshake,
  buildInterested,
  buildRequest,
  parse,
} from "./message.js";
import { Pieces } from "./Pieces.js";

import { Queue } from "./Queue.js";
import fs from "fs";
import { log } from "console";

const downloadExport = (torrent, path) => {
  let st = new Set();
  getPeers(torrent, (peers) => {
    const pieces = new Pieces(torrent);
    const file = fs.openSync(path, "w");
    peers.forEach((peer) => {
      if (!st.has(peer.ip)) {
        download(peer, torrent, pieces, file);
      }
      st.add(peer.ip);
    });
  });
};

function download(peer, torrent, pieces, file) {
  console.log("Connecting to:", peer);

  const socket = new net.Socket(); // Correctly create a new socket instance

  socket.on("error", (e) => {
    console.log("Could not connect to:", peer);
  });
  socket.on("data", (data) => {
    console.log("Received data:", data);
  });

  socket.on("end", () => {
    console.log("Connection ended by peer.");
  });

  socket.connect(peer.port, peer.ip, () => {
    console.log("Connected to:", peer);
    let a = socket.write(buildHandshake(torrent));
    if (a) {
      console.log("successfully written");
      const queue = new Queue(torrent);
      onWholeMsg(socket, (msg) => {
        console.log("Entered Message Function");
        msgHandler(msg, socket, pieces, queue, file);
      });
    } else {
      console.log("What?");
    }
  });
}

const msgHandler = (msg, socket, pieces, queue, file) => {
  console.log("Message handler entered");
  if (isHandshake(msg)) {
    socket.write(buildInterested());
  } else {
    const m = parse(msg);
    console.log("message: ", m);
    if (m.id === 0) chokeHandler(socket);
    else if (m.id === 1) unchokeHandler(socket, pieces, queue);
    else if (m.id === 4) haveHandler(m.payload, socket, pieces, queue);
    else if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
    // socket, pieces, queue, torrent, file, pieceResp
    else if (m.id === 7)
      pieceHandler(socket, pieces, queue, torrent, file, m.payload);
  }
  console.log("Message handler exited");
};

const chokeHandler = (socket) => {
  socket.end();
};
const unchokeHandler = (socket, pieces, queue) => {
  queue.choked = false;
  requestPiece(socket, pieces, queue);
};

const haveHandler = (payload, socket, pieces, queue) => {
  console.log("Entering haveHandler");
  const pieceIndex = payload.readInt32BE(0);
  // queue.queue.push(pieceIndex);
  const queueEmpty = queue.length() === 0;
  queue.queue(pieceIndex);
  if (queueEmpty) {
    requestPiece(socket, pieces, queue);
  }
  console.log("Leaving haveHandler");
};

const bitfieldHandler = (socket, pieces, queue, payload) => {
  console.log("Entering bitfieldHandler");
  const queueEmpty = queue.length() === 0;
  payload.forEach((byte, i) => {
    for (let j = 0; j < 8; j++) {
      if (byte % 2) queue.queue(i * 8 + 7 - j);
      byte = Math.floor(byte / 2);
    }
  });
  if (queueEmpty) requestPiece(socket, pieces, queue);
  log("Leaving bitfieldHandler");
};
const pieceHandler = (socket, pieces, queue, torrent, file, pieceResp) => {
  console.log("Recieved Response", pieceResp);
  pieces.addRecieved(pieceResp);
  const offset =
    pieceResp.index * torrent.info["piece length"] + pieceResp.begin;
  fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {});
  if (pieces.isDone()) {
    console.log("Done!");
    socket.end();
    try {
      fs.closeSync(file);
    } catch (err) {}
  } else {
    requestPiece(socket, pieces, queue);
  }
};

const requestPiece = (socket, pieces, queue) => {
  console.log("Entering requestPiece");
  if (queue.choked) return null;
  while (queue.length()) {
    const pieceBlock = queue.deque();
    if (pieces.needed(pieceBlock)) {
      socket.write(buildRequest(pieceBlock));
      pieces.addRequested(pieceBlock);
      break;
    }
  }
  console.log("Leaving requestPiece");
};
const isHandshake = (msg) =>
  msg.length === msg.readUInt8(0) + 49 &&
  msg.toString("utf-8", 1) === "BitTorrent protocol";

const onWholeMsg = (socket, callback = () => {}) => {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;
  socket.on("data", (recvBuf) => {
    const msgLen = () =>
      handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);
    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(savedBuf.slice(0, msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
};

export { downloadExport };
