import { dump, strTag, type Node } from "js-yaml";

/**
 * Force-quotes only actual string values when dumping YAML frontmatter,
 * leaving booleans/numbers/null as plain scalars.
 *
 * js-yaml's built-in `forceQuotes` option quotes every scalar regardless of
 * type. Since a quoted scalar defaults to a string on reload, forceQuotes
 * has to attach an explicit `!!bool`/`!!float` tag to any non-string value
 * to preserve its type — e.g. `published: !!bool "true"` instead of
 * `published: true`. We only want strings quoted, so instead of
 * forceQuotes we walk the AST (via js-yaml's `transform` dump option) and
 * mark just the string-tagged value nodes as double-quoted.
 */
function walk(node: Node | undefined, isKey: boolean): void {
  if (!node) return;
  if (node.kind === "scalar") {
    if (!isKey && node.tag === strTag.tagName) node.style.doubleQuoted = true;
  } else if (node.kind === "sequence") {
    node.items.forEach((item) => walk(item, false));
  } else if (node.kind === "mapping") {
    node.items.forEach(({ key, value }) => {
      walk(key, true);
      walk(value, false);
    });
  }
}

export function dumpFrontmatterYaml(data: unknown): string {
  return dump(data, {
    lineWidth: -1, // Disable line wrapping
    quoteStyle: "double", // Use double quotes when quoting is needed
    flowLevel: -1, // Use block style for collections, but not scalars
    transform: (documents) =>
      documents.forEach((doc) => walk(doc.contents ?? undefined, false)),
  });
}
