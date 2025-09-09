export const config = {
  apis: {
    clientApiKey: 'CLIENT_API_KEY',
  },
  routes: {
    chatCompletions: '/v1/chat/completions',
    imageGeneration: '/v1/generation',
  },
  models: {
    text: {
      modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      displayName: 'imaginary-v1-instruct',
    },
    image: {
      modelId: '@cf/black-forest-labs/flux-1-schnell',
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
      steps: 4,
      guidance: 3.5,
    },
  },
};