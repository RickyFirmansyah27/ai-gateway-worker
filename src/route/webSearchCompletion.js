import { SystemPromptModel } from '../helper/sytem-prompt.js';
import { estimateTokens, json } from '../helper/utils.js';
import { config } from '../config/config.js';

export async function handleWebSearchChatCompletions(request, env) {
  const body = await request.json();
  const model = body.model || config.models.web_search.modelId;
  const messages = body.messages;

  if (!messages || !Array.isArray(messages)) {
    return json({ error: { message: "messages must be an array" } }, 400);
  }

  // System prompt
  const systemPrompt = {
    role: "system",
    content: SystemPromptModel(config.models.web_search.displayName)
  };

  const sanitizedMessages = [
    systemPrompt,
    ...messages.map(m => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content.join(" ")
        : String(m.content),
    })),
  ];

  const options = {
    messages: sanitizedMessages,
    max_tokens: body.max_tokens || config.defaults.chat.maxTokens,
    temperature: body.temperature ?? config.defaults.chat.temperature,
    top_p: body.top_p ?? config.defaults.chat.topP,
    presence_penalty: body.presence_penalty ?? config.defaults.chat.presencePenalty,
    frequency_penalty: body.frequency_penalty ?? config.defaults.chat.frequencyPenalty,
    tools: [{ "google_search": {} }],
    tool_choice: { "function": "google_search" },
  };

  // Call Cloudflare AI
  const aiResponse = await env.AI.run(model, options);
  const generatedText = aiResponse.response?.content || aiResponse.response;
  const tool_calls = aiResponse.response?.tool_calls || [];

  // Estimate tokens
  const promptText = sanitizedMessages.map(m => m.content).join(" ");
  const prompt_tokens = estimateTokens(promptText);
  const completion_tokens = estimateTokens(generatedText);
  const total_tokens = prompt_tokens + completion_tokens;

  return json({
    id: "chatcmpl-" + crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: config.models.web_search.displayName,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: generatedText,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens,
      completion_tokens,
      total_tokens,
    },
  });
}