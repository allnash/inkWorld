# Recognition and AI Integration

Ink AI integrates with several AI services for recognition and generation.

## Google Handwriting Recognition API

Provided via a backend proxy — no API key needed. Set `INK_RECOGNITION_API_URL` in your `.env`.

### Input

```json
{
  "strokes": [
    { "points": [{ "x": 100, "y": 50, "t": 0 }, { "x": 150, "y": 55, "t": 16 }] },
    { "points": [{ "x": 200, "y": 48, "t": 300 }] }
  ]
}
```

### Output

```json
{
  "rawText": "hello",
  "lines": [{
    "tokens": [{
      "text": "hello",
      "boundingBox": { "left": 95, "top": 40, "right": 255, "bottom": 70 }
    }]
  }]
}
```

### In Code

```typescript
recognitionService.recognizeGoogle(strokes)
```

The service is already wrapped for you in `src/recognition/RecognitionService.ts`.

## Vision Models via OpenRouter

Rasterize strokes to an image, send to a vision model, get structured output back.

An API key is provided — set `INK_OPENROUTER_API_KEY` in your `.env`.

```typescript
import { OpenRouter } from '@openrouter/sdk';
const client = new OpenRouter({ apiKey: import.meta.env.INK_OPENROUTER_API_KEY });

const response = await client.chat.send({
  model: 'google/gemini-2.5-flash',
  messages: [{ role: 'user', content: [
    { type: 'text', text: 'Identify the drawn shapes.' },
    { type: 'image_url', image_url: { url: rasterizedDataUrl } },
  ]}],
  responseFormat: { type: 'json_schema', jsonSchema: {
    name: 'shapes', strict: true,
    schema: { type: 'object', additionalProperties: false,
      properties: { shapes: { type: 'array', items: { type: 'string' } } },
      required: ['shapes'] },
  }},
});
const { shapes } = JSON.parse(response.choices[0].message.content);
```

**Recommended models:**
- **Gemini Flash** — Fast and cheap, good for quick recognition
- **DeepSeek OCR** — Good for structured content extraction

## fal.ai Sketch Refinement (BYOK)

Draw a rough sketch → AI generates a refined image → keep iterating.

The `SketchableImage` element uses this for AI-powered drawing assistance. Bring your own fal.ai API key.
