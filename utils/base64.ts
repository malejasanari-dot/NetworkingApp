/**
 * Decodifica una cadena Base64 a un ArrayBuffer binario compatible con React Native y Web.
 * Evita el uso de fetch('file://...') en React Native / Hermes.
 */
export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  
  if (typeof atob === 'function') {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Fallback con tabla de decodificación Base64
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64Data.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const bufferLength = (len * 3) >> 2;
  const bytes = new Uint8Array(bufferLength);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = chars.indexOf(clean[i]);
    const encoded2 = chars.indexOf(clean[i + 1]);
    const encoded3 = chars.indexOf(clean[i + 2]);
    const encoded4 = chars.indexOf(clean[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== -1 && encoded3 !== 64) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== -1 && encoded4 !== 64) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return bytes.buffer;
}
