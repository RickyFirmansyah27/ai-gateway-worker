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

  const tools = [{ "google_search": {} }];
  const tool_choice = { "function": "google_search" };

  const response = await fetch(config.apis.gemini.url + '/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GEMINI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: sanitizedMessages,
      max_tokens: body.max_tokens || config.defaults.chat.maxTokens,
      temperature: body.temperature ?? config.defaults.chat.temperature,
      top_p: body.top_p ?? config.defaults.chat.topP,
      presence_penalty: body.presence_penalty ?? config.defaults.chat.presencePenalty,
      frequency_penalty: body.frequency_penalty ?? config.defaults.chat.frequencyPenalty,
      tools: tools,
      tool_choice: tool_choice
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Gemini API error' } }));
    return json({ error: { message: errorData.error.message || 'Gemini API error' } }, response.status);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message || {};
  const generatedText = message.content || '';
  const tool_calls = message.tool_calls || [];

  // Estimate tokens
  const promptText = sanitizedMessages.map(m => m.content).join(" ");
  const prompt_tokens = estimateTokens(promptText);
  const completion_tokens = estimateTokens(generatedText);
  const total_tokens = prompt_tokens + completion_tokens;

  return json({
    id: data.id || "chatcmpl-" + crypto.randomUUID(),
    object: data.object || "chat.completion",
    created: data.created || Math.floor(Date.now() / 1000),
    model: data.model || config.models.web_search.displayName,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: generatedText,
          ...(tool_calls.length > 0 ? { tool_calls: tool_calls } : {}),
        },
        finish_reason: data.choices?.[0]?.finish_reason || "stop",
      },
    ],
    usage: {
      prompt_tokens,
      completion_tokens,
      total_tokens,
    },
  });
}