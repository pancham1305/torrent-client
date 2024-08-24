import { BLOCK_LEN, blocksperPiece } from "./torrent-parser.js";

class Pieces {
  constructor(torrent) {
    function buildPiecesArray() {
      const nPieces = torrent.info.pieces.length / 20;
      const arr = new Array(nPieces).fill(null);
      return arr.map((_, i) =>
        new Array(blocksperPiece(torrent, i)).fill(false)
      );
    }
    this._requested = buildPiecesArray();
    this._recieved = buildPiecesArray();
  }
  addRequested(pieceBlock) {
    const blockIndex = pieceBlock.begin / BLOCK_LEN;
    this._requested[pieceBlock.index][blockIndex] = true;
  }
  addRecieved(pieceBlock) {
    const blockIndex = pieceBlock.begin / BLOCK_LEN;
    this._recieved[pieceBlock.index][blockIndex] = true;
  }
  needed(pieceBlock) {
    if (this._requested.every((blocks) => blocks.every((i) => i))) {
      this._requested = this._recieved.map((blocks) => blocks.slice());
    }
    const blockIndex = pieceBlock.begin / BLOCK_LEN;
    return !this._requested[pieceBlock.index][blockIndex];
  }
  isDone() {
    return this._recieved.every((blocks) => blocks.every((i) => i));
  }
}

export { Pieces };
