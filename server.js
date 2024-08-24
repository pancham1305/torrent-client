import fs from "fs";
import bencode from "bencode";
import { getPeers } from "./src/tracker.js";
import { open, infoHash, size } from "./src/torrent-parser.js";

import { downloadExport } from "./src/download.js";
const torrent = open(process.argv[2]);

const decoder = new TextDecoder();

downloadExport(torrent, decoder.decode(torrent.info.name));
