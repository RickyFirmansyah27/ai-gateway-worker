import { SystemPromptModel } from '../helper/system-prompt.js';
import { estimateTokens, json } from '../helper/utils.js';
import { config } from '../config/global-config.js';

export async function handleChatCompletions(request, env) {
  const body = await request.json();
  const model = body.model || config.models.text.modelId;
  const messages = body.messages;

  if (!messages || !Array.isArray(messages)) {
    return json({ error: { message: "messages must be an array" } }, 400);
  }

  // ✅ System prompt yang dipush
  const systemPrompt = {
    role: "system",
    content: SystemPromptModel(config.models.text.displayName)
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


  // 🧠 Call Cloudflare AI model default
  const aiResponse = await env.AI.run(model, {
    instructions: SystemPromptModel(config.models.text.displayName),
    input: sanitizedMessages,
  });

  const outputMessage = aiResponse.output;
  const message =  outputMessage?.find(item => item.type === "message");
  const generatedText = message?.content
    ?.filter(c => c.type === "output_text")
    ?.map(c => c.text)
    ?.join("\n") ?? "";


  // 🔢 Estimasi token
  const promptText = sanitizedMessages.map(m => m.content).join(" ");
  const prompt_tokens = estimateTokens(promptText);
  const completion_tokens = estimateTokens(generatedText);
  const total_tokens = prompt_tokens + completion_tokens;

  return json({
    id: "chatcmpl-" + crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: config.models.text.displayName,
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