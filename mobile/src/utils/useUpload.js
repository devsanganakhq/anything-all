import * as React from "react";
import { useAuthStore } from "@/utils/auth/store";

function useUpload() {
  const [loading, setLoading] = React.useState(false);
  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);
      let response;

      if ("reactNativeAsset" in input && input.reactNativeAsset) {
        const asset = input.reactNativeAsset;

        if (asset.file) {
          const proxyBaseUrl =
            process.env.EXPO_PUBLIC_BASE_URL ||
            process.env.EXPO_PUBLIC_PROXY_BASE_URL;
          const formData = new FormData();
          formData.append("file", asset.file);
          response = await globalThis.fetch(
            `${proxyBaseUrl}/api/upload`,
            {
              method: "POST",
              body: formData,
            },
          );
        } else {
          const FileSystem = require("expo-file-system/legacy");

          const proxyBaseUrl =
            process.env.EXPO_PUBLIC_BASE_URL ||
            process.env.EXPO_PUBLIC_PROXY_BASE_URL;
          // Let the native HTTP client derive Host from the upload URL.
          // Empty or stale proxy host headers can route Vercel to a missing deployment.
          const headers = {};

          try {
            const auth = useAuthStore.getState().auth;
            if (auth?.jwt) headers.authorization = `Bearer ${auth.jwt}`;
          } catch {}

          const uploadResult = await FileSystem.uploadAsync(
            `${proxyBaseUrl}/api/upload`,
            asset.uri,
            {
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              fieldName: "file",
              headers,
            },
          );

          if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error(
              `Upload failed (${uploadResult.status}): ${uploadResult.body}`,
            );
          }

          let data;
          try {
            data = JSON.parse(uploadResult.body);
          } catch (parseError) {
            throw new Error(
              "Upload failed: invalid response from upload service",
            );
          }

          return { url: data.url, mimeType: data.mimeType || null };
        }
      } else if ("url" in input) {
        response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: input.url }),
        });
      } else if ("base64" in input) {
        response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64: input.base64 }),
        });
      } else {
        response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: input.buffer,
        });
      }
      if (!response || !response.ok) {
        if (response?.status === 413) {
          throw new Error("Upload failed: File too large.");
        }
        const body = await response?.text().catch(() => "");
        throw new Error(
          `Upload failed (${response?.status ?? "no response"}): ${body}`,
        );
      }
      const data = await response.json();
      return { url: data.url, mimeType: data.mimeType || null };
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        return { error: uploadError.message };
      }
      if (typeof uploadError === "string") {
        return { error: uploadError };
      }
      return { error: "Upload failed" };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;
