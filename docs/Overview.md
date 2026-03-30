# Ink AI Overview

Ink AI transforms hand-drawn stylus strokes into interactive digital elements. Rather than capturing bitmaps, the system records **timestamped 2D polyline strokes** — ordered arrays of coordinate points with timestamps and optional pressure data.

## Core Concepts

### Two Main Ideas

**Idea 1: Create elements from ink**

Draw strokes → System recognizes structure → Element becomes interactive

**Idea 2: Interact with elements via ink**

Element exists → Strokes drawn on it → Element interprets strokes

These two ideas combine to create a fluid pen-first experience. For example, TicTacToe uses both: four strokes create a grid (creation), then subsequent strokes become X/O game moves (interaction).

### Why Polylines, Not Pixels

Each stroke is an ordered array of `StrokeInput`:

```typescript
interface StrokeInput {
  x: number;           // X coordinate
  y: number;           // Y coordinate
  timeMillis: number;  // Timestamp
  pressure?: number;   // 0–1, from stylus
}
```

This representation enables:

- **ML training data** — Sequence + timing + pressure = richer signal than pixels
- **Interactivity** — Strokes are discrete objects you can select, move, erase, assign to elements
- **Resolution independence** — Renders perfectly at any zoom level
- **Efficient storage** — For a text-heavy meeting note, just points, no bitmaps

Pixels lose all of this.

### What Is an Element?

A TypeScript object with a type discriminator, an id, a transform, and type-specific data:

```typescript
type Element =
  | StrokeElement
  | ShapeElement
  | GlyphElement
  | InkTextElement
  | TicTacToeElement
  | CoordinatePlaneElement
  | SketchableImageElement
  | ImageElement
  | SudokuElement
  | BridgesElement
  | MinesweeperElement
  | NonogramElement
  | TangoElement
  | QueensElement
  | JigsawElement
  | ColorConnectElement;
```

Every element in the system is one of these. You add yours to this union.

## Capabilities

- **Shape recognition** — Recognizes drawn shapes and beautifies them
- **Text and lists** — Handwriting recognition converts ink to editable text
- **Games** — TicTacToe, Sudoku, Minesweeper, Bridges, Nonogram, Tango, Queens, Color Connect, Hangman
- **Coordinate planes** — Interactive graphing
- **AI-powered sketching** — Rough sketches refined by AI image generation (fal.ai)
- **Eraser** — Scribble-based erasing with stroke splitting
- **Undo/Redo** — Full history support
