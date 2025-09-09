import { json } from '../helper/utils.js';

export async function handleImageGeneration(request, env) {
  const body = await request.json();
  const model = "@cf/black-forest-labs/flux-1-schnell";

  // ambil semua field
  const {
    prompt,
    seed,
    width,
    height,
    steps,
    guidance,
    negative_prompt
  } = body;

  // cek prompt wajib
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return json({
      error: {
        message:
          "Missing required field: 'prompt'. Example body: { \"prompt\": \"a cyberpunk cat\", \"width\": 512, \"height\": 512 }"
      }
    }, 400);
  }

  // set default value
  const payload = {
    prompt,
    seed: seed ?? Math.floor(Math.random() * 10000),
    width: width ?? 512,
    height: height ?? 512,
    steps: steps ?? 4,           // Flux Schnell biasanya 4 steps sudah bagus
    guidance: guidance ?? 3.5,   // CFG scale
    negative_prompt: negative_prompt ?? "" // opsional
  };

  try {
    const aiResponse = await env.AI.run(model, payload);


    return json({
      id: "imggen-" + crypto.randomUUID(),
      object: "image",
      created: Math.floor(Date.now() / 1000),
      model: "imaginary-v1-instruct",
      params_used: payload, // 👍 kasih tau user param yg kepake
      data:
        {

          base64: aiResponse.image
        }
    });
  } catch (err) {
    return json({ error: { message: err.message } }, 500);
  }
}