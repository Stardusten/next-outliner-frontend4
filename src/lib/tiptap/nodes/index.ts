import { BlockRef } from "./block-ref";
import { Codeblock } from "./codeblock";
import { Doc } from "./doc";
import { File } from "./file";
import { LineBreak } from "./line-break";
import { ListItem } from "./list-item";
import { Paragraph } from "./paragraph";
import { Search } from "./search";
import { Tag } from "./tag";
import { Text } from "./text";

export const nodeExtensions = [
  BlockRef,
  Codeblock,
  Doc,
  File,
  LineBreak,
  ListItem,
  Paragraph,
  Search,
  Text,
  Tag,
];
