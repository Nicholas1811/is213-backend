const S3_API_BASE = "https://smuedu-dev.outsystemsenterprise.com/SMULab_AmazonS3/rest/AmazonS3";
const S3_FOLDER = "listings";
const S3_SUBFOLDER = "images";
const S3_API_KEY = import.meta.env.VITE_S3_API_KEY as string;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function decodeUrlSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractEmbeddedUrl(value: string): string | null {
  const directCandidate = value.trim();
  if (isHttpUrl(directCandidate)) {
    return directCandidate;
  }

  const decodedCandidate = decodeUrlSafely(directCandidate);
  if (isHttpUrl(decodedCandidate)) {
    return decodedCandidate;
  }

  const lastHttpsIndex = decodedCandidate.lastIndexOf("https://");
  const lastHttpIndex = decodedCandidate.lastIndexOf("http://");
  const startIndex = Math.max(lastHttpsIndex, lastHttpIndex);

  if (startIndex === -1) {
    return null;
  }

  const embeddedCandidate = decodeUrlSafely(decodedCandidate.slice(startIndex));
  return isHttpUrl(embeddedCandidate) ? embeddedCandidate : null;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getExtension(file: File): string {
  return file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
}

export async function uploadImageToS3(file: File): Promise<string> {
  const base64 = await toBase64(file);
  const fileName = `${crypto.randomUUID()}${getExtension(file)}`;

  const uploadRes = await fetch(`${S3_API_BASE}/UploadFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Contacts-Key": S3_API_KEY },
    body: JSON.stringify({
      folderName: S3_FOLDER,
      subFolderName: S3_SUBFOLDER,
      fileName,
      file: base64,
      override: false,
    }),
  });

  if (!uploadRes.ok) throw new Error(`S3 upload failed (${uploadRes.status})`);
  const { key } = await uploadRes.json();
  return key as string;
}

export async function fetchImageUrl(key: string): Promise<string> {
  const embeddedUrl = extractEmbeddedUrl(key);
  if (embeddedUrl) {
    return embeddedUrl;
  }

  const res = await fetch(`${S3_API_BASE}/FetchFileUrl`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Contacts-Key": S3_API_KEY },
    body: JSON.stringify({ folderName: S3_FOLDER, subFolderName: S3_SUBFOLDER, key }),
  });

  if (!res.ok) throw new Error(`S3 fetch URL failed (${res.status})`);
  const { url } = await res.json();
  return url as string;
}
