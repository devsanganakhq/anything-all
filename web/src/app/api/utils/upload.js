/**
 * Shared upload helper — sends files to Anything's upload API.
 * Accepts: { url }, { base64 }, { buffer }, or a File/Blob-like object.
 */

function guessMimeFromBase64(base64) {
  if (!base64 || typeof base64 !== "string") return "image/jpeg";
  if (base64.startsWith("data:")) {
    const m = base64.match(/^data:([^;]+);/);
    return m?.[1] || "image/jpeg";
  }
  // PNG magic in base64
  if (base64.startsWith("iVBOR")) return "image/png";
  // JPEG
  if (base64.startsWith("/9j/")) return "image/jpeg";
  // GIF
  if (base64.startsWith("R0lGOD")) return "image/gif";
  // WEBP
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

function toDataUri(base64, mimeType) {
  if (!base64) return base64;
  if (base64.startsWith("data:")) return base64;
  return `data:${mimeType || guessMimeFromBase64(base64)};base64,${base64}`;
}

async function uploadToAnything({ url, buffer, base64, contentType }) {
  const token = process.env.ANYTHING_PROJECT_TOKEN;
  const headers = {
    "x-createxyz-project-group-id":
      process.env.NEXT_PUBLIC_PROJECT_GROUP_ID || "",
    "x-createxyz-host": process.env.NEXT_PUBLIC_CREATE_HOST || "",
    "x-forwarded-host": process.env.NEXT_PUBLIC_CREATE_HOST || "",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body;
  let methodContentType;

  if (buffer) {
    // Prefer JSON+base64 — Anything's upload API is picky about raw bodies
    const mime = contentType || "application/octet-stream";
    const b64 = Buffer.from(buffer).toString("base64");
    methodContentType = "application/json";
    body = JSON.stringify({
      base64: toDataUri(b64, mime),
      mimeType: mime,
      mime_type: mime,
    });
  } else if (base64) {
    const mime = contentType || guessMimeFromBase64(base64);
    methodContentType = "application/json";
    body = JSON.stringify({
      base64: toDataUri(base64, mime),
      mimeType: mime,
      mime_type: mime,
    });
  } else if (url) {
    methodContentType = "application/json";
    body = JSON.stringify({
      url,
      mimeType: contentType || undefined,
      mime_type: contentType || undefined,
    });
  } else {
    throw Object.assign(new Error("No upload payload provided"), { status: 400 });
  }

  headers["Content-Type"] = methodContentType;

  const response = await fetch("https://api.anything.com/v0/upload", {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(
      response.status === 413
        ? "Upload failed: File too large."
        : `Upload failed (${response.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return {
    url: data.url,
    mimeType: data.mimeType || contentType || null,
  };
}

/**
 * Handle an incoming Request (multipart, JSON, or raw bytes) and upload.
 */
async function handleUploadRequest(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file =
      formData.get("file") || formData.get("image") || formData.get("photo");
    if (!file || typeof file === "string") {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadToAnything({
      buffer: Buffer.from(arrayBuffer),
      contentType: file.type || "image/jpeg",
    });
    return Response.json(result);
  }

  if (contentType.includes("application/json")) {
    const body = await request.json();
    if (body.url) {
      const result = await uploadToAnything({
        url: body.url,
        contentType: body.mimeType || body.mime_type || undefined,
      });
      return Response.json(result);
    }
    if (body.base64) {
      const result = await uploadToAnything({
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

  // Raw binary body
  const arrayBuffer = await request.arrayBuffer();
  if (!arrayBuffer.byteLength) {
    return Response.json({ error: "Empty upload body" }, { status: 400 });
  }
  const result = await uploadToAnything({
    buffer: Buffer.from(arrayBuffer),
    contentType: contentType || "image/jpeg",
  });
  return Response.json(result);
}

async function upload(opts) {
  return uploadToAnything(opts);
}

export { upload, uploadToAnything, handleUploadRequest };
export default upload;
