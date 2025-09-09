import { SystemPromptModel } from '../helper/sytem-prompt.js';
import { estimateTokens, json } from '../helper/utils.js';

export async function handleChatCompletions(request, env) {
  const body = await request.json();
  const model = body.model || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const messages = body.messages;

  if (!messages || !Array.isArray(messages)) {
    return json({ error: { message: "messages must be an array" } }, 400);
  }

  // ✅ System prompt yang dipush
  const systemPrompt = {
    role: "system",
    content: SystemPromptModel("imaginary-v1-instruct")
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
    max_tokens: body.max_tokens || 8129,
    temperature: body.temperature ?? 0.7,
    top_p: body.top_p ?? 1,
    presence_penalty: body.presence_penalty ?? 0,
    frequency_penalty: body.frequency_penalty ?? 0,
  };

  // 🧠 Call Cloudflare AI model default
  const aiResponse = await env.AI.run(model, options);
  const generatedText = aiResponse.response;

  // 🔢 Estimasi token
  const promptText = sanitizedMessages.map(m => m.content).join(" ");
  const prompt_tokens = estimateTokens(promptText);
  const completion_tokens = estimateTokens(generatedText);
  const total_tokens = prompt_tokens + completion_tokens;

  return json({
    id: "chatcmpl-" + crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "imaginary-v1-instruct",
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