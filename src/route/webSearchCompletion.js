import { SystemPromptModel } from '../helper/sytem-prompt.js';
import { json } from '../helper/utils.js';
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

    // Build Gemini request format
    const contents = [];
    let systemInstructionParts = [];
    sanitizedMessages.forEach(m => {
      if (m.role === 'system') {
        systemInstructionParts.push({ text: m.content });
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      }
    });

    // Gemini request
    const geminiRequest = {
      contents,
      generationConfig: {
        temperature: body.temperature ?? config.defaults.chat.temperature,
        topP: body.top_p ?? config.defaults.chat.topP,
        maxOutputTokens: body.max_tokens || config.defaults.chat.maxTokens,
      },
      tools: [{
        "googleSearch": {}
      }]
    };

    if (systemInstructionParts.length > 0) {
      geminiRequest.systemInstruction = { parts: systemInstructionParts };
    }

    // AI Studio grounding request
    const API_KEY = env[config.apis.gemini.key];
    const response = await fetch(`${config.apis.gemini.url}/${model}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(geminiRequest)
    });

    if (!response.ok) {
      let errorText = await response.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { error: { message: errorText } }; }
      const errorMessage = errorData?.error?.message || errorText || 'Imaginary Server error';
      return json({ error: { message: errorMessage, raw: errorData } }, response.status);
    }

    const data = await response.json();

    // Extract groundingMetadata
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata || {};
    const groundingChunks = groundingMetadata.groundingChunks || [];
    const groundingSupports = groundingMetadata.groundingSupports || [];

    // Build list_website
    const list_website = groundingChunks.map((chunk, index) => {
      const url = chunk.web?.uri || '';
      const title = chunk.web?.title || '';
      // Find supports that reference this chunk's index
      const matchingSupports = groundingSupports.filter(support => support.groundingChunkIndices?.includes(index));
      const text = matchingSupports.map(support => support.segment?.text || '').join('\n');
      return { url, title, text };
    });

    // Build summary
    const concatenatedText = groundingSupports.map(support => support.segment?.text || '').join('\n');
    const summary = { text: concatenatedText };

    // Parse Gemini response to OpenAI format
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error("No Response from AI model");
    }
    const generatedText = candidate.content?.parts?.[0]?.text || '';

    const finishReasonMap = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
      'OTHER': 'stop'
    };
    const finish_reason = finishReasonMap[candidate.finishReason] || 'stop';

    // Usage from Gemini
    const usageMeta = data.usageMetadata;
    const prompt_tokens = usageMeta?.promptTokenCount || 0;
    const completion_tokens = usageMeta?.candidatesTokenCount || 0;
    const total_tokens = usageMeta?.totalTokenCount || (prompt_tokens + completion_tokens);

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
          finish_reason,
        },
      ],
      usage: {
        prompt_tokens,
        completion_tokens,
        total_tokens,
      },
      list_website,
      summary,
    });

  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: { message: "Internal server error", detail: err.message } }, 500);
  }
}
