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

// 🖼️ Base64 converter untuk binary data (aman dari call stack overflow)
async function convertToBase64(arrayBuffer) {
   try {
     if (!arrayBuffer) {
       throw new Error('ArrayBuffer is required');
     }

     // Convert ArrayBuffer to Uint8Array
     const bytes = new Uint8Array(arrayBuffer);
     let binaryString = '';

     console.log(`Converting ${bytes.length} bytes to base64...`);

     // Build binary string character by character to avoid call stack overflow
     // Process in smaller chunks for better memory management
     const chunkSize = 16384; // 16KB chunks for better performance

     for (let i = 0; i < bytes.length; i += chunkSize) {
       const end = Math.min(i + chunkSize, bytes.length);
       const chunk = bytes.subarray(i, end);

       for (let j = 0; j < chunk.length; j++) {
         binaryString += String.fromCharCode(chunk[j]);
       }
     }

     // Convert binary string to base64
     const base64String = btoa(binaryString);

     console.log(`Base64 conversion successful. Length: ${base64String.length}`);
     return base64String;

   } catch (error) {
     console.error('Base64 conversion failed:', error);
     throw new Error(`Failed to convert to base64: ${error.message}`);
   }
 }

// 🖼️ Helper untuk handle binary response dari image API
async function handleBinaryImageResponse(response) {
   try {
     if (!response.ok) {
       const errorText = await response.text();
       throw new Error(`API error ${response.status}: ${errorText}`);
     }

     const contentType = response.headers.get('content-type');
     console.log('Response content-type:', contentType);

     // Get raw binary data
     const arrayBuffer = await response.arrayBuffer();
     console.log('Received binary data size:', arrayBuffer.byteLength);

     // Convert to base64
     const base64String = await convertToBase64(arrayBuffer);

     return base64String;

   } catch (error) {
     console.error('Binary response handling failed:', error);
     throw error;
   }
 }


export { json, estimateTokens, convertToBase64, handleBinaryImageResponse };