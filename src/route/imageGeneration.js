import { json } from '../helper/utils.js';
import { config } from '../config/global-config.js';
import { uploadImageFromBase64 } from '../service/imageKit.js';

export async function handleImageGeneration(request, env) {
  const body = await request.json();
  const model = config.models.image.modelId;

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
    width: width ?? config.defaults.image.width,
    height: height ?? config.defaults.image.height,
    steps: steps ?? config.defaults.image.steps,           // Flux Schnell biasanya 4 steps sudah bagus
    guidance: guidance ?? config.defaults.image.guidance,   // CFG scale
    negative_prompt: negative_prompt ?? "" // opsional
  };

  try {
    const aiResponse = await env.AI.run(model, payload);

    const uploadResult = await uploadImageFromBase64(aiResponse.image, env);
    if (uploadResult.error) {
      return json({
        error: {
          message: uploadResult.error
        }
      }, 500);
    }

    // Kembalikan response dengan URL publik jika berhasil
    return json({
      id: "imggen-" + crypto.randomUUID(),
      object: "image_url",
      created: Math.floor(Date.now() / 1000),
      model: config.models.image.displayName,
      params_used: payload,
      data:
        {
          url: uploadResult.url
        }
    });
  } catch (err) {
    return json({ error: { message: err.message } }, 500);
  }
}