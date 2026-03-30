# Element Plugin Architecture

The element system uses a registry-based plugin architecture. Each element type lives in `src/elements/<type>/` and self-registers on import. No changes are needed to `App.tsx`, `ElementRenderer`, `PaletteMenu`, or dispatch logic when adding new elements.

## The ElementPlugin Interface

```typescript
interface ElementPlugin<T extends Element> {
  readonly elementType: string;  // Must match element's `type` field
  readonly name: string;

  /* Creation */
  canCreate?(strokes: Stroke[]): boolean;
  createFromInk?(strokes, context, recognition?): Promise<CreationResult | null>;

  /* Interaction */
  readonly triesEagerInteractions?: boolean;  // bypass debounce (tap games)
  isInterestedIn?(element: T, strokes, strokeBounds): boolean;
  acceptInk?(element: T, strokes, recognition?): Promise<InteractionResult>;

  /* Handle-based Interaction */
  getHandles?(element: T): HandleDescriptor[];
  onHandleDrag?(element: T, handleId, phase, point): T;

  /* Rendering */
  render(ctx: CanvasRenderingContext2D, element: T, options?): void;
  getBounds(element: T): BoundingBox | null;
}
```

### Required Methods

- **`render()`** — Draw the element to a Canvas 2D context
- **`getBounds()`** — Return the element's bounding box

### Optional: Creation

- **`canCreate(strokes)`** — Quick check: could these strokes form this element?
- **`createFromInk(strokes, context, recognition?)`** — Attempt to create the element. Returns `CreationResult` with the new elements, consumed strokes, and a confidence score.

### Optional: Interaction

- **`isInterestedIn(element, strokes, strokeBounds)`** — Does this element want to handle these strokes? Typically checks bounding box overlap.
- **`acceptInk(element, strokes, recognition?)`** — Process the strokes and return an updated element.
- **`triesEagerInteractions`** — When `true`, interaction is attempted immediately on stroke completion, bypassing the debounce. Used for tap-based games like Minesweeper.

### Optional: Handle-based Interaction

- **`getHandles(element)`** — Return draggable handles with position, hit radius, cursor, and appearance.
- **`onHandleDrag(element, handleId, phase, point)`** — Handle drag lifecycle (`start`, `update`, `end`). Returns updated element.

## Element Creation Paths

There are two paths to creating elements:

### Path 1: Direct Structure Interpretation

The element detects structure from raw strokes. For example, TicTacToe detects a `#` grid from 4 line strokes via `canCreate()`.

- More work to implement
- Enables natural, gesture-based creation

### Path 2: Rectangle-with-X Catalog

Draw a rectangle → cross it with an X → pick from a menu. The element only needs `render()` + `acceptInk()`.

- Easier for rapid prototyping
- Register a palette entry with `registerPaletteEntry()`

Both paths coexist — start with the catalog approach, add structure interpretation later.

## Example: TicTacToe

TicTacToe demonstrates both creation and interaction in one element.

### Creation: Detecting a Grid

```typescript
function canCreate(strokes: Stroke[]): boolean {
  if (strokes.length !== 4) return false;
  const { valid } = validateBounds(strokes);
  return valid;
}
```

`createFromInk()` then:
1. Classifies each stroke as horizontal or vertical
2. Finds 4 intersection points from 2H + 2V lines
3. Constructs 9 cell quads from the intersections
4. Optionally confirms via handwriting recognition API (looks like "#")

### Rendering: Drawing the Board

```typescript
render(ctx: CanvasRenderingContext2D, element: TicTacToeElement) {
  drawGridStrokes(ctx, element.gridStrokes);

  for (const cell of element.cells) {
    if (cell.piece === 'X') drawAnimatedX(ctx, cell, progress);
    if (cell.piece === 'O') drawAnimatedO(ctx, cell, progress);
  }

  if (element.winLine) drawWinLine(ctx, element.winLine);
}
```

Standard Canvas 2D API — `beginPath()`, `moveTo()`, `stroke()`.

### Interaction: Playing the Game

```typescript
function isInterestedIn(element, strokes, strokeBounds): boolean {
  return boundsOverlap(getBounds(element), strokeBounds);
}

async function acceptInk(element, strokes, recognition?) {
  const cellIndex = findCellForStrokes(element, strokes);
  const piece = await recognizePiece(strokes, recognition);
  const newCells = placePiece(element.cells, cellIndex, piece);
  const cpuMove = computerMove(newCells, cpuPiece, humanPiece);
  return { updatedElement: { ...element, cells: newCells } };
}
```

Strokes become game moves. The computer responds automatically.

## File Structure

Each plugin lives in its own directory:

```
src/elements/<type>/
├── types.ts          # Interface definition + factory (required)
├── renderer.ts       # render() + getBounds() (required)
├── creator.ts        # canCreate() + createFromInk() (optional)
├── interaction.ts    # isInterestedIn() + acceptInk() (optional)
├── icon.tsx          # Palette menu icon (optional)
└── index.ts          # Plugin wiring + registration (required)
```

See [New element HOWTO.md](New%20element%20HOWTO.md) for step-by-step instructions on adding a new element type.
