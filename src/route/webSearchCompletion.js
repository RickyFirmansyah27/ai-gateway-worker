import { SystemPromptModel } from '../helper/system-prompt.js';
import { estimateTokens, json } from '../helper/utils.js';
import { config } from '../config/global-config.js';

export async function handleWebSearchChatCompletions(request, env) {
  try {
    const body = await request.json();
    const model = body.model || config.models.web_search.modelId;
    const messages = body.messages;

    if (!messages || !Array.isArray(messages)) {
      return json({ error: { message: "messages must be an array" } }, 400);
    }

    // System prompt
    const systemPrompt = {
      role: "system",
      content: SystemPromptModel(model)
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

    const options = {
      input: sanitizedMessages,
    };

    // 🧠 Call Cloudflare AI model
    const aiResponse = await env.AI.run(model, options);

    // Handle the new, complex array response format and other fallbacks
    let generatedText = '';
    if (Array.isArray(aiResponse)) {
        const messageObject = aiResponse.find(item => item.type === 'message');
        if (messageObject && messageObject.content) {
            const outputTextObject = messageObject.content.find(contentItem => contentItem.type === 'output_text');
            if (outputTextObject && outputTextObject.text) {
                generatedText = outputTextObject.text;
            }
        }
    } else if (typeof aiResponse === 'string') {
        generatedText = aiResponse;
    } else if (aiResponse.response) { // Standard CF AI response
        generatedText = aiResponse.response;
    } else if (aiResponse.result && aiResponse.result.response) { // Wrapped response
        generatedText = aiResponse.result.response;
    }
    
    if (!generatedText) {
      // Fallback if no text was found in the known structures
      console.error("Unexpected AI response structure:", aiResponse);
      // Attempt to find any string in the response
      const findText = (obj) => {
          for(const key in obj) {
              if(typeof obj[key] === 'string') return obj[key];
              if(typeof obj[key] === 'object' && obj[key] !== null) {
                  const found = findText(obj[key]);
                  if(found) return found;
              }
          }
          return null;
      }
      generatedText = findText(aiResponse) || JSON.stringify(aiResponse);
    }


    // 🔢 Estimasi token
    const promptText = sanitizedMessages.map(m => m.content).join(" ");
    const prompt_tokens = estimateTokens(promptText);
    const completion_tokens = estimateTokens(generatedText);
    const total_tokens = prompt_tokens + completion_tokens;

    return json({
      id: "chatcmpl-" + crypto.randomUUID(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
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

  } catch (err) {
    console.error("Unhandled error in webSearchCompletion:", err);
    return json({ error: { message: "Internal server error", detail: err.message } }, 500);
  }
}

