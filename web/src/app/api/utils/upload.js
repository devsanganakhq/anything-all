/**
 * Shared upload helper — stores files in Amazon S3 and returns a public URL.
 * Accepts: { url }, { base64 }, { buffer }, or a File/Blob-like object.
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { getSessionUserId } from "@/app/api/utils/getUserId";

const MAX_ATTEMPTS = 3;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function guessMimeFromBase64(base64) {
  if (!base64 || typeof base64 !== "string") return "image/jpeg";
  if (base64.startsWith("data:")) {
    const m = base64.match(/^data:([^;]+);/);
    return m?.[1] || "image/jpeg";
  }
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

function extForMime(mime) {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return map[mime] || "bin";
}

function stripDataUri(base64) {
  if (!base64 || typeof base64 !== "string") return base64;
  const idx = base64.indexOf("base64,");
  return idx >= 0 ? base64.slice(idx + "base64,".length) : base64;
}

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const publicBase = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");

  if (!bucket || !accessKeyId || !secretAccessKey || !publicBase) {
    const err = new Error(
      "S3 upload is not configured. Set S3_BUCKET, S3_REGION, S3_PUBLIC_BASE_URL, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.",
    );
    err.status = 500;
    throw err;
  }

  return { bucket, region, accessKeyId, secretAccessKey, publicBase };
}

let s3Client;
function getS3Client() {
  if (s3Client) return s3Client;
  const { region, accessKeyId, secretAccessKey } = getS3Config();
  s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return s3Client;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function putObjectWithRetry({ key, body, contentType }) {
  const { bucket, publicBase } = getS3Config();
  const client = getS3Client();
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return {
        url: `${publicBase}/${key}`,
        mimeType: contentType || null,
      };
    } catch (error) {
      lastError = error;
      const status =
        error.$metadata?.httpStatusCode ||
        (error.name === "TimeoutError" ? 408 : 500);
      const retryable =
        RETRYABLE.has(status) ||
        error.name === "SlowDown" ||
        error.name === "TimeoutError" ||
        error.name === "NetworkingError";

      if (!retryable || attempt === MAX_ATTEMPTS) {
        const err = new Error(
          status === 413
            ? "Upload failed: File too large."
            : status === 429
              ? "Too many uploads right now. Please wait a moment and try again."
              : `Upload failed (${status}): ${error.message || "S3 error"}`,
        );
        err.status = status === 429 ? 429 : status === 413 ? 413 : 500;
        throw err;
      }

      await sleep(400 * attempt);
    }
  }

  const err = new Error(lastError?.message || "Upload failed");
  err.status = 500;
  throw err;
}

async function resolvePayload({ url, buffer, base64, contentType }) {
  if (buffer) {
    const mime = contentType || "application/octet-stream";
    return {
      body: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
      contentType: mime,
    };
  }

  if (base64) {
    const mime = contentType || guessMimeFromBase64(base64);
    return {
      body: Buffer.from(stripDataUri(base64), "base64"),
      contentType: mime,
    };
  }

  if (url) {
    const response = await fetch(url);
    if (!response.ok) {
      const err = new Error(`Failed to fetch source URL (${response.status})`);
      err.status = 400;
      throw err;
    }
    const arrayBuffer = await response.arrayBuffer();
    const mime =
      contentType ||
      response.headers.get("content-type") ||
      "application/octet-stream";
    return { body: Buffer.from(arrayBuffer), contentType: mime };
  }

  const err = new Error("No upload payload provided");
  err.status = 400;
  throw err;
}

async function uploadToS3(opts) {
  const { body, contentType } = await resolvePayload(opts);
  const key = `uploads/${randomUUID()}.${extForMime(contentType)}`;
  return putObjectWithRetry({ key, body, contentType });
}

/** @deprecated Use upload / uploadToS3 — kept for import compatibility. */
async function uploadToAnything(opts) {
  return uploadToS3(opts);
}

/**
 * Handle an incoming Request (multipart, JSON, or raw bytes) and upload.
 */
async function handleUploadRequest(request) {
  try {
    await getSessionUserId(request);
  } catch (error) {
    const authError = new Error("Authentication required");
    authError.status = error.code === "ACCOUNT_SUSPENDED" ? 403 : 401;
    throw authError;
  }
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file =
      formData.get("file") || formData.get("image") || formData.get("photo");
    if (!file || typeof file === "string") {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadToS3({
      buffer: Buffer.from(arrayBuffer),
      contentType: file.type || "image/jpeg",
    });
    return Response.json(result);
  }

  if (contentType.includes("application/json")) {
    const body = await request.json();
    if (body.url) {
      const result = await uploadToS3({
        url: body.url,
        contentType: body.mimeType || body.mime_type || undefined,
      });
      return Response.json(result);
    }
    if (body.base64) {
      const result = await uploadToS3({
        base64: body.base64,
        contentType:
          body.mimeType || body.mime_type || guessMimeFromBase64(body.base64),
      });
      return Response.json(result);
    }
    return Response.json(
      { error: "Provide url or base64 in JSON body" },
      { status: 400 },
    );
  }

  const arrayBuffer = await request.arrayBuffer();
  if (!arrayBuffer.byteLength) {
    return Response.json({ error: "Empty upload body" }, { status: 400 });
  }
  const result = await uploadToS3({
    buffer: Buffer.from(arrayBuffer),
    contentType: contentType || "image/jpeg",
  });
  return Response.json(result);
}

async function upload(opts) {
  return uploadToS3(opts);
}

function uploadErrorStatus(error) {
  const status = error?.status;
  if (status === 400 || status === 413 || status === 429) return status;
  return 500;
}

export {
  upload,
  uploadToS3,
  uploadToAnything,
  handleUploadRequest,
  uploadErrorStatus,
};
export default upload;
