# Getting Started

## Repository Structure

```
ink-ai-hack-playground/
├── src/
│   ├── elements/          <- where you build
│   │   ├── registry/      <- plugin interface + registry
│   │   ├── tictactoe/     <- full example to study
│   │   └── ...
│   ├── types/             <- data models (elements, strokes)
│   └── recognition/       <- HW API integration
└── docs/
    └── New element HOWTO.md  <- step-by-step guide
```

## Setup

```bash
git clone https://github.com/note-ai-inc/ink-ai-hack-playground.git
cd ink-ai-hack-playground
cp .env.example .env
npm install
npm run dev
```

Set these in your `.env`:

```
INK_RECOGNITION_API_URL=https://strokes.hack.ink.ai
INK_OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

## Dev Flow

- **Hot reload** — Save → see changes instantly
- **Mouse input works** — Stylus is better but not required for development
- **Tablet testing** — Use a real tablet for stylus input:
  - Install `adb`
  - `adb reverse tcp:5174 tcp:5174`
  - Browse to `localhost:5174` on the tablet
- **HOWTO doc** — `docs/New element HOWTO.md` walks through every step:
  - Define your element type
  - Create plugin directory (renderer, creator, interaction)
  - Register with one import line — no dispatch logic changes needed
- This is a prototype — expect rough edges, no test coverage

## Build Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server with HMR (http://localhost:5173)
npm run build            # TypeScript compile + Vite bundle
npm run lint             # ESLint check
npm run preview          # Preview production build
```
