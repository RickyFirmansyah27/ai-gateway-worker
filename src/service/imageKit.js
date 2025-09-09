export async function uploadImageFromBase64(base64String, env, fileName) {
  try {
    if (!base64String) {
      const errorMessage = "Upload function called without base64 string.";
      console.error(errorMessage);
      return { url: null, error: errorMessage };
    }

    const finalFileName = fileName || `imaginary-${Date.now()}.png`;

    // Convert base64 to binary
    const binaryString = atob(base64String);
    const binary = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binary[i] = binaryString.charCodeAt(i);
    }

    const formData = new FormData();
    const apiKey = env.IMAGEKIT_PRIVATE_KEY;
    formData.append("file", new Blob([binary], {type: 'image/png'}), finalFileName);
    formData.append("fileName", finalFileName);

    const resp = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${apiKey}:`),
      },
      body: formData,
    });

    const result = await resp.json();

    if (!resp.ok) {
      console.error("ImageKit upload failed:", result);
      if (resp.status === 401 || resp.status === 403) {
        return { url: null, error: "ImageKit authentication failed. Please verify the IMAGEKIT_PRIVATE_KEY secret in your Worker settings." };
      }
      return { url: null, error: `ImageKit upload failed with status: ${resp.status}` };
    }

    return { url: result.url, error: null };

  } catch (err) {
    const errorMessage = `Upload function error: ${err.message}`;
    console.error(errorMessage);
    return { url: null, error: errorMessage };
  }
}