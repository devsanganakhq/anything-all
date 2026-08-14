/**
 * POST /api/upload
 *
 * Accepts:
 *   - multipart/form-data with a "file" field
 *   - JSON { url } or { base64 }
 *   - raw application/octet-stream body
 *
 * Returns: { url, mimeType }
 */
import { handleUploadRequest } from "@/app/api/utils/upload";

export async function POST(request) {
  try {
    return await handleUploadRequest(request);
  } catch (error) {
    console.error("Upload error:", error);
    const status = error.status === 413 ? 413 : 500;
    return Response.json(
      { error: error.message || "Upload failed" },
      { status },
    );
  }
}
