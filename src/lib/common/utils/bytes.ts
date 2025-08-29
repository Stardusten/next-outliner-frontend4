export function uint8ArrayToBase64(array: Uint8Array): string {
  // 分块处理大数组，避免栈溢出
  const CHUNK_SIZE = 8192; // 8KB chunks
  let binary = "";

  for (let i = 0; i < array.length; i += CHUNK_SIZE) {
    const chunk = array.slice(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(
    atob(base64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
}
