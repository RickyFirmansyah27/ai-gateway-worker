import { json } from './src/helper/utils.js';
import { handleChatCompletions } from './src/route/chatCompletions.js';
import { handleImageGeneration } from './src/route/imageGeneration.js';
import { config } from './src/config/config.js';

export default {
  async fetch(request, env) {
    const API_KEY = env[config.apis.clientApiKey];
    const url = new URL(request.url);
    const auth = request.headers.get("Authorization");

    // 🔐 API key check
    if (auth !== `Bearer ${API_KEY}`) {
      return json({ error: { message: "Unauthorized" } }, 401);
    }

    try {
      // 🚫 Only allow POST
      if (request.method !== "POST") {
        return json({ error: { message: "Only POST allowed" } }, 405);
      }

      // 📝 Chat Completion
      if (url.pathname === config.routes.chatCompletions) {
        return await handleChatCompletions(request, env);
      }

      // 🎨 Image Generation
      if (url.pathname === config.routes.imageGeneration) {
        return await handleImageGeneration(request, env);
      }

      // ❌ Not allowed path
      return json({ error: { message: "Not allowed path" } }, 404);
    } catch (err) {
      return json({ error: { message: err.message } }, 500);
    }
  },
};
