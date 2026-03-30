// 3D scene generation service - uses OpenRouter with Claude vision
// to convert ink sketches into Three.js scene descriptions.

import { chatCompletion, isOpenRouterConfigured } from './OpenRouterService';

export interface SceneObject {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'group';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  args: number[];
  children?: SceneObject[];
}

export interface SceneDescription {
  description: string;
  objects: SceneObject[];
}

const SYSTEM_PROMPT = `You are a 3D modeling assistant. You look at hand-drawn sketches and generate Three.js scene descriptions as JSON.

Return ONLY a valid JSON object with this exact structure:
{
  "description": "brief description of what you see",
  "objects": [
    {
      "type": "box" | "sphere" | "cylinder" | "cone" | "torus" | "plane",
      "position": [x, y, z],
      "rotation": [x, y, z],
      "scale": [x, y, z],
      "color": "#hexcolor",
      "args": [...]
    }
  ]
}

Geometry args by type:
- box: [width, height, depth]
- sphere: [radius, widthSegments, heightSegments]
- cylinder: [radiusTop, radiusBottom, height, radialSegments]
- cone: [radius, height, radialSegments]
- torus: [radius, tube, radialSegments, tubularSegments]
- plane: [width, height]

Rules:
- Compose multiple primitives to approximate the drawn shape
- Use 1-12 objects
- Center the scene at origin
- Use colors that match or make sense for the object
- Keep scale reasonable (objects between 0.5 and 5 units)
- Add slight rotations for visual interest when appropriate
- Return ONLY the JSON, no markdown fences or extra text`;

/**
 * Send a sketch image to a vision model via OpenRouter and get back a 3D scene description.
 */
export async function generateThreeJSScene(imageDataUrl: string): Promise<SceneDescription> {
  const raw = await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', imageUrl: { url: imageDataUrl } } as any,  // eslint-disable-line @typescript-eslint/no-explicit-any
          { type: 'text', text: 'Look at this hand-drawn sketch and generate a Three.js 3D scene that represents what is drawn. Return only the JSON.' },
        ],
      },
    ],
    {
      model: 'anthropic/claude-sonnet-4',
      maxTokens: 4096,
    },
  );

  // Parse JSON, handling possible markdown fences
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const scene = JSON.parse(jsonStr) as SceneDescription;

  if (!scene.objects || !Array.isArray(scene.objects)) {
    throw new Error('Invalid scene description: missing objects array');
  }

  return scene;
}

/**
 * Generate a 3D scene from a text description (no image needed).
 */
export async function generateThreeJSSceneFromText(description: string): Promise<SceneDescription> {
  const raw = await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Create a 3D scene of: ${description}\n\nUse multiple primitives composed together to make it look realistic. Return only the JSON.`,
      },
    ],
    {
      model: 'anthropic/claude-sonnet-4',
      maxTokens: 4096,
    },
  );

  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const scene = JSON.parse(jsonStr) as SceneDescription;

  if (!scene.objects || !Array.isArray(scene.objects)) {
    throw new Error('Invalid scene description: missing objects array');
  }

  return scene;
}

/**
 * Check whether the service is configured (delegates to OpenRouter check).
 */
export function isAnthropicConfigured(): boolean {
  return isOpenRouterConfigured();
}
