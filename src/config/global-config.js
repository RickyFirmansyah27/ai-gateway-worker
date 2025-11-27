export const config = {
  apis: {
    clientApiKey: 'CLIENT_API_KEY',
    gemini: {
      key: 'GEMINI_API_KEY',
      url: 'https://generativelanguage.googleapis.com/v1beta'
    },
    chutes: {
      token: 'CHUTES_API_TOKEN'
    },
  },
  routes: {
    chatCompletions: '/v1/chat/completions',
    imageGeneration: '/v1/generation',
    imageGenerationV2: '/v2/generation',
  },
  models: {
    text: {
      modelId: '@cf/openai/gpt-oss-120b',
      displayName: 'imaginary-v1-instruct',
    },
    image: {
      modelId: '@cf/black-forest-labs/flux-1-schnell',
      displayName: 'imaginary-v1-instruct',
    },
    imagev2: {
      modelId: 'chroma',
      displayName: 'imaginary-v2-instruct',
    },
    web_search: {
      modelId: 'models/gemini-3-pro-preview',
      displayName: 'imaginary-v1-instruct',
    },
  },
  defaults: {
    chat: {
      maxTokens: 8129,
      temperature: 0.7,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
    },
    image: {
      width: 1024,
      height: 1024,
      steps: 24,
      guidance: 7,
    },
    imageV2: {
      width: 1024,
      height: 1024,
      steps: 50,
      guidance: 7.5,
    },
  },
};