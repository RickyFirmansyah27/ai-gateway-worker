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

  // Sanitize messages
  const sanitizedMessages = [
    systemPrompt,
    ...messages.map(m => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content.join(" ")
        : String(m.content),
    })),
  ];

  // Tools (OpenAI schema)
  const tools = [
    {
      type: "function",
      function: {
        name: "searchGoogle",
        description: "Search using Google",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            }
          },
          required: ["query"]
        }
      }
    }
  ];

  // Force Gemini to call the function
  const function_call = { name: "searchGoogle" };

  const API_KEY = env[config.apis.gemini.key];
  const response = await fetch(config.apis.gemini.url + '/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: sanitizedMessages,
      max_tokens: body.max_tokens || config.defaults.chat.maxTokens,
      temperature: body.temperature ?? config.defaults.chat.temperature,
      top_p: body.top_p ?? config.defaults.chat.topP,
      presence_penalty: body.presence_penalty ?? config.defaults.chat.presencePenalty,
      frequency_penalty: body.frequency_penalty ?? config.defaults.chat.frequencyPenalty,
      tools,
      function_call
    })
  });

  // Error handling
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: 'Gemini API error' } };
    }
    const errorMessage = errorData?.error?.message || 'Unknown Gemini API error';
    return json({ error: { message: errorMessage } }, response.status);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const generatedText = choice?.message?.content || '';

  // Token estimation
  const promptText = sanitizedMessages.map(m => m.content).join(" ");
  const prompt_tokens = estimateTokens(promptText);
  const completion_tokens = estimateTokens(generatedText);
  const total_tokens = prompt_tokens + completion_tokens;

  // Final response
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
        },
        finish_reason: choice?.finish_reason || "stop",
      },
    ],
    usage: {
      prompt_tokens,
      completion_tokens,
      total_tokens,
    },
  });
}
