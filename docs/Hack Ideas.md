# Hack Ideas

## Games

- **Wordle** — Write 5-letter guesses, color-coded feedback
- **Spelling Bee** — 7 letters in a honeycomb, find all valid words
- **Dots and Boxes** — Draw lines between dots, claim squares
- **Gomoku** — Five-in-a-row on a grid, simple to implement

Build on handwriting recognition + grid/cell mechanics.

## Data Visualization & Productivity

- **Bar / line / pie charts** — Sketch charts; generate clean, editable visualizations
- **Structured tables** — Draw rough table; convert into structured data
- **Gantt timeline** — Draw timeline; auto-generate project plan or calendar
- **Dynamic templates** — Create dashboard: journal + calendar + to-dos + meeting snippets
- **Forms to surveys** — Draw form layout; generate functional fillable survey

## Academic & STEM Learning

- **Chemistry molecules** — Recognize molecular diagrams; provide structure + interpretation
- **Circuit simulator** — Draw circuit diagram; simulate voltage/current behavior
- **Math equation solver** — Recognize equations and use solver for step-by-step solutions
- **Physics sim** — Draw ramps, pulleys, pendulums; simulate motion & forces
- **Kinematics playground** — Sketch objects; simulate motion-specific scenarios like friction, acceleration, and constraints

## Creative & Other

- **Sketch to video** — Draw object, record prompt; animate object accordingly
- **Sheet music** — Draw staff and place notes → playback
- **Image generation** — Sketch turns into refined AI-generated imagery
- **3D model** — Multi-view sketch becomes rotatable 3D object

## Domain-Specific Recognition

- **Flowchart** — Turn rough diagrams into executable logic or code flows
- **Mind map** — Convert freeform nodes into structured interactive graphs
- **Architectural rendering** — Plan/elevation generates full 3D environment
- **Floor plan editing** — Import plan, sketch changes (walls, windows); update plan
- **Slide deck** — Rough storyboard becomes polished presentation

## App & UI Generation

- **Interactive UI prototype** — Hand-drawn UI interactive with sketch aesthetic
- **App prototype** — UI sketch to no-code working prototype; bonus: multi-platform export
- **UI components** — Recognize buttons, forms, nav bars and make interactive

## Research Challenges

### Tokenization

Point-by-point tokenization (as in Cursive Transformer, TrInk) produces ~286 tokens/word — like spelling text one character at a time. Bezier fitting acts as byte-pair encoding for strokes: cubic curves with 4 control points capture what dozens of samples do, achieving 2-8x compression (~30 segments/word vs ~250 raw points). Open questions include encoding Bezier octets as discrete transformer tokens, cumulative drift from autoregressive generation, and whether compression gains actually improve generation quality.

### InkSight

Offline-to-online conversion: extract stroke data (x, y, pen state) from handwriting images. InkSight works well on clean, non-cursive, word-level crops. Full pages need OCR line detection first. Training data is the bottleneck — millions of handwriting images exist but almost no stroke-level datasets. Open questions: scaling to cursive scripts, font skeleton-to-stroke conversion, and bridging the synthetic/natural domain gap.

### Multi-Writer Models

Style-aware synthesis: generate handwriting in any writer's style by disentangling content from style in strokes. Stroke beautification: make rough strokes nicer while preserving writer identity — a geometry problem, not pixels. Relevant datasets:

| Dataset      | Samples       | Writers  | Format          |
|-------------|---------------|----------|-----------------|
| IAMonDB     | 11.6K lines   | 198      | dx, dy, pen     |
| UNIPEN      | 117K segs     | 2,200+   | abs x, y        |
| BRUSH       | 27.6K         | 170      | abs x, y, pen   |
| Ink AI 9K   | 9K words      | 1        | abs x, y, pen   |
| Ink AI 650K | 650K words    | 1 (aug)  | abs x, y, pen   |

### Inkteractivity Foundation Model

One model for the full pipeline — creation + interaction unified, no recognize-then-hand-off. Universal ink understanding: text, math, chemistry, diagrams, games — all from the same strokes. Structures become interactive (grid → game, circuit → simulation). The model learns from every stroke and correction in real time, creating a data flywheel.
