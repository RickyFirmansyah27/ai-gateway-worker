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


export { json, estimateTokens };