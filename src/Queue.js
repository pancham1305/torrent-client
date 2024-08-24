// import { open } from "./torrent-parser";

import { blocksperPiece, BLOCK_LEN, blockLen } from "./torrent-parser.js";

class Queue {
  constructor(torrent) {
    console.log("Queue Formation took place!");
    this._torrent = torrent;
    this._queue = [];
    this.choked = true;
  }
  queue(pieceIndex) {
    const nBlocks = blocksperPiece(this._torrent, pieceIndex);
    for (let i = 0; i < nBlocks; i++) {
      const pieceBlock = {
        index: pieceIndex,
        begin: i * BLOCK_LEN,
        length: blockLen(this._torrent, pieceIndex, i),
      };
      this._queue.push(pieceBlock);
    }
  }
  deque() {
    return this._queue.shift();
  }
  peek() {
    return this._queue[0];
  }
  length() {
    return this._queue.length;
  }
}

export { Queue };
