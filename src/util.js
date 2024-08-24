import crypto from "crypto";
let id = null; //peer id
// it is used to uniquely define a peer.
// Here, AT is the name of the CLient, and 0001 is the version number

const genId = () => {
  if (!id) {
    id = crypto.randomBytes(20);
    Buffer.from("-AT0001-").copy(id, 0);
  }
  return id;
};
export { genId };
