import { Node } from "@tiptap/core";
import { fastListItemNodeViewRenderer } from "../js-node-views/fast-list-item/fast-list-item";
import { ListItem } from "./list-item";

const listItemConfig = { ...ListItem.config };
delete listItemConfig.addNodeView;

export const FastListItem = Node.create({
  ...listItemConfig,
  name: "fastListItem",
  addNodeView() {
    return fastListItemNodeViewRenderer;
  },
});
