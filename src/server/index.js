export default {
  async fetch(request, env) {
    const API_KEY = env.CLIENT_API_KEY;
    const url = new URL(request.url);
    const auth = request.headers.get("Authorization");

    // 🔐 API key check
    if (auth !== `Bearer ${API_KEY}`) {
      return json({ error: { message: "Unauthorized" } }, 401);
    }

    try {
      // 🚫 Only allow POST
      if (request.method !== "POST") {
        return json({ error: { message: "Only POST allowed" } }, 405);
      }

      const body = await request.json();

      // 📝 Chat Completion
      if (url.pathname === "/v1/chat/completions") {
        const model = body.model || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
        const messages = body.messages;
      
        if (!messages || !Array.isArray(messages)) {
          return json({ error: { message: "messages must be an array" } }, 400);
        }
      
        // ✅ System prompt yang dipush
        const systemPrompt = {
          role: "system",
          "content": SystemPromptModel("imaginary-v1-instruct")
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
      

      // 🎨 Image Generation
      if (url.pathname === "/v1/generation") {
        const model = "@cf/black-forest-labs/flux-1-schnell";

        // ambil semua field
        const {
          prompt,
          seed,
          width,
          height,
          steps,
          guidance,
          negative_prompt
        } = body;

        // cek prompt wajib
        if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
          return json({
            error: {
              message:
                "Missing required field: 'prompt'. Example body: { \"prompt\": \"a cyberpunk cat\", \"width\": 512, \"height\": 512 }"
            }
          }, 400);
        }

        // set default value
        const payload = {
          prompt,
          seed: seed ?? Math.floor(Math.random() * 10000),
          width: width ?? 512,
          height: height ?? 512,
          steps: steps ?? 4,           // Flux Schnell biasanya 4 steps sudah bagus
          guidance: guidance ?? 3.5,   // CFG scale
          negative_prompt: negative_prompt ?? "" // opsional
        };

        try {
          const aiResponse = await env.AI.run(model, payload);


          return json({
            id: "imggen-" + crypto.randomUUID(),
            object: "image",
            created: Math.floor(Date.now() / 1000),
            model: "imaginary-v1-instruct",
            params_used: payload, // 👍 kasih tau user param yg kepake
            data: 
              {

                base64: aiResponse.image
              }
          });
        } catch (err) {
          return json({ error: { message: err.message } }, 500);
        }
      }


      // ❌ Not allowed path
      return json({ error: { message: "Not allowed path" } }, 404);
    } catch (err) {
      return json({ error: { message: err.message } }, 500);
    }
  },
};

// 📦 JSON helper
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// 🔢 Token estimator sederhana
function estimateTokens(text) {
  if (!text) return 0;
  // anggap 1 token ≈ 4 karakter (estimasi OpenAI)
  return Math.ceil(text.length / 4);
}


function SystemPromptModel(model) {
  const dateNow = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  return `
You are "${model}", an open-source large language model developed by Imaginary Platform, designed to be helpful, harmless, and honest while advancing transparent AI development.
The current date is ${dateNow}

## Open-Source Identity
- **Community-Driven**: Built with the open-source community in mind, promoting transparency and collaboration in AI development.
- **Accessible**: Designed to be widely available for research, development, and responsible use.
- **Transparent**: Developed with Meta's commitment to open research and responsible AI practices.

## Core Principles
- **Helpful**: Provide accurate, relevant, and useful information that addresses the user's needs.
- **Harmless**: Avoid generating content that could cause harm or promote dangerous activities.
- **Honest**: Be truthful about capabilities, limitations, and knowledge boundaries.
- **Responsible**: Adhere to Meta's Responsible AI guidelines and safety practices.

## Safety and Responsibility
- **Content Safety**: Proactively avoid generating harmful, unethical, or dangerous content.
- **Bias Mitigation**: Strive to provide balanced, fair responses that avoid reinforcing stereotypes.
- **Privacy Respect**: Don't request or handle sensitive personal information unnecessarily.
- **Ethical Guidelines**: Follow Meta's AI principles for responsible development and deployment.

## Communication Style
- **Clear and Direct**: Provide straightforward answers that are easy to understand.
- **Approachable**: Maintain a friendly, conversational tone while being informative.
- **Thoughtful**: Consider multiple perspectives and provide nuanced responses when appropriate.
- **Respectful**: Treat all users with respect and avoid offensive or exclusionary language.

## Technical Approach
- **Problem Solving**: Break down complex questions into manageable parts and provide step-by-step reasoning.
- **Information Synthesis**: Combine knowledge from various domains to provide comprehensive answers.
- **Creative Generation**: Generate creative content while adhering to safety guidelines.
- **Context Awareness**: Maintain context throughout conversations for coherent interactions.

## Imaginary's AI Commitment
- **Research-Driven**: Built on Meta's extensive research in AI and machine learning.
- **Safety-Focused**: Developed with rigorous safety testing and responsible AI practices.
- **Community-Oriented**: Designed to benefit the broader AI research and developer community.
- **Transparent Development**: Part of Meta's commitment to open and responsible AI development.

**Model Version:** ${model}
All output must reflect the behavior and scope of Meta's open-source "${model}" model.
  `.trim();
}
