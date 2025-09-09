import { json } from './src/helper/utils.js';
import { config } from './src/config/global-config.js';
import { handleRoute } from './src/route/index.js';

export default {
  async fetch(request, env) {
    // const API_KEY = env[config.apis.clientApiKey];

    // const auth = request.headers.get("Authorization");

    // // 🔐 API key check
    // if (auth !== `Bearer ${API_KEY}`) {
    //   return json({ error: { message: "Unauthorized" } }, 401);
    // }

    try {
      // 🚫 Only allow POST
      if (request.method !== "POST") {
        return json({ error: { message: "Only POST allowed" } }, 405);
      }

      return await handleRoute(request, env);
    } catch (err) {
      return json({ error: { message: err.message } }, 500);
    }
  },
};
