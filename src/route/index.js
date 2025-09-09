import { json } from '../helper/utils.js';
import { handleChatCompletions } from './chatCompletions.js';
import { handleWebSearchChatCompletions } from './webSearchCompletion.js';
import { handleImageGeneration } from './imageGeneration.js';
import { config } from '../config/config.js';

export async function handleRoute(request, env) {
  const url = new URL(request.url);

  // Routing using switch
  switch (url.pathname) {
    case config.routes.chatCompletions: {
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        return json({ error: { message: "Invalid JSON in request body" } }, 400);
      }
      const newRequest = new Request(request.url, { method: request.method, headers: request.headers, body: JSON.stringify(body) });
      const handler = (body.webSearch === true) ? handleWebSearchChatCompletions : handleChatCompletions;
      return await handler(newRequest, env);
    }
    case config.routes.imageGeneration: {
      return await handleImageGeneration(request, env);
    }
    default: {
      return json({ error: { message: "Not allowed path" } }, 404);
    }
  }
}