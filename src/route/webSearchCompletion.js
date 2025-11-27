import { SystemPromptModel } from '../helper/system-prompt.js';
import { formatChatResponse, json, sanitizeMessages} from '../helper/utils.js';
import { config } from '../config/global-config.js';
import { GoogleGenAI } from '@google/genai';

export async function handleWebSearchChatCompletions(request, env) {
  const apiKey = env[config.apis.gemini.key];
  const body = await request.json();
  const model = body.model || config.models.web_search.modelId;
  const messages = body.messages;

  if (!messages || !Array.isArray(messages)) {
    return json('Messages must be an array', 'badRequest');
  }

  // System prompt
  const systemPrompt = {
    role: 'system',
    content: SystemPromptModel(config.models.web_search.displayName),
  };

  const sanitizedMessages = [systemPrompt, ...sanitizeMessages(messages)];

  // Build Gemini request format efficiently
  const contents = [];
  let systemInstructionParts = [];
  sanitizedMessages.forEach(m => {
    if (m.role === 'system') {
      systemInstructionParts.push({ text: m.content });
    } else {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }
  });

  const geminiRequest = {
    contents,
    generationConfig: {
      temperature: body.temperature ?? config.defaults.chat.temperature,
      topP: body.top_p ?? config.defaults.chat.topP,
      maxOutputTokens: body.max_tokens || config.defaults.chat.maxTokens,
    },
    tools: [{ googleSearch: {} }],
  };

  if (systemInstructionParts.length > 0) {
    geminiRequest.systemInstruction = { parts: systemInstructionParts };
  }

  const genAI = new GoogleGenAI(apiKey);
  const data = await genAI.models.generateContent({
      model: model,
      contents: geminiRequest.contents,
      config: {
        temperature: geminiRequest.generationConfig.temperature,
        topP: geminiRequest.generationConfig.topP,
        maxOutputTokens: geminiRequest.generationConfig.maxOutputTokens,
      },
      tools: geminiRequest.tools,
      systemInstruction: geminiRequest.systemInstruction,
    });

  // Process grounding data efficiently
  const groundingMetadata = data.candidates?.[0]?.groundingMetadata || {};
  const groundingChunks = groundingMetadata.groundingChunks || [];
  const groundingSupports = groundingMetadata.groundingSupports || [];

  const listWebsite = groundingChunks.map((chunk, index) => {
    const url = chunk.web?.uri || '';
    const title = chunk.web?.title || '';
    const matchingSupports = groundingSupports.filter(support =>
      support.groundingChunkIndices?.includes(index)
    );
    const text = matchingSupports.map(support => support.segment?.text || '').join('\n');
    return { url, title, text };
  });

  const concatenatedText = groundingSupports.map(support => support.segment?.text || '').join('\n');
  const summary = { text: concatenatedText };

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('No Response from AI model');
  }

  const generatedText = candidate.content?.parts?.[0]?.text || '';
  const finishReasonMap = {
    STOP: 'stop',
    MAX_TOKENS: 'length',
    SAFETY: 'content_filter',
    RECITATION: 'content_filter',
    OTHER: 'stop',
  };
  const finishReason = finishReasonMap[candidate.finishReason] || 'stop';

  const usageMeta = data.usageMetadata;
  const promptTokens = usageMeta?.promptTokenCount || 0;
  const completionTokens = usageMeta?.candidatesTokenCount || 0;
  const totalTokens = usageMeta?.totalTokenCount || promptTokens + completionTokens;

  const usage = {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  };

  const response = formatChatResponse(generatedText, config.models.web_search.displayName, usage);
  response.choices[0].finish_reason = finishReason;
  response.list_website = listWebsite;
  response.summary = summary;

  return response;
}