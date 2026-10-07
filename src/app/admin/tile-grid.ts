/** How many columns a grid lays out, from its computed `grid-template-columns`. */
export function columnCount(gridTemplateColumns: string): number {
  const tracks = gridTemplateColumns.trim().split(/\s+/);
  return gridTemplateColumns === "none" || tracks[0] === "" ? 1 : tracks.length;
}

/**
 * The height that shows the first `rows` rows of a grid and a sliver
 * (`peek`) of the next, given each item's top edge in order. The sliver is
 * what tells the owner there's more to scroll to. Null when the grid has no
 * more rows than that, so nothing needs to scroll.
 */
export function visibleRowsHeight(
  itemTops: readonly number[],
  columns: number,
  rows: number,
  peek: number,
): number | null {
  const nextRowTop = itemTops[rows * columns];
  return nextRowTop === undefined ? null : nextRowTop + peek;
}
