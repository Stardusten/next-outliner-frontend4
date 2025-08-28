import { LoroDoc } from "loro-crdt";

const doc = new LoroDoc();
const map = doc.getMap("map");
map.set("a", {
  1: "a",
  2: "b",
  3: "c",
});

console.log(map.toJSON());
