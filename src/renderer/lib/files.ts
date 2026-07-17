// File and URL helpers used by the Agent image input.
// All functions are pure-ish (no UI); they talk to the browser FileReader / fetch APIs.

const IMAGE_FILE_URL_PATTERN = /^file:\/\/.+\.(?:png|jpe?g|webp|gif|bmp)$/i;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("无法读取图片"));
      }
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("无法读取图片")));
    reader.readAsDataURL(file);
  });
}

export async function readUrlAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法读取图片：${response.status}`);
  }
  const blob = await response.blob();
  return readFileAsDataUrl(
    new File([blob], decodeURIComponent(url.split("/").at(-1) || "image"), { type: blob.type })
  );
}

export function isImageFileUrl(value: string): boolean {
  return IMAGE_FILE_URL_PATTERN.test(value);
}

// Drop image file:// URLs from a free-form text blob — useful when a paste
// first lands as text and is then promoted to an image attachment.
export function stripImageFileUrls(value: string): string {
  return value
    .split(/\s+/)
    .filter((part) => !isImageFileUrl(part))
    .join(" ")
    .trim();
}
