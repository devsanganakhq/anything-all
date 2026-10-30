/**
 * Shared Hono app (API + auth + middleware).
 * Local Node uses createHonoServer; Vercel exports app.fetch.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import nodeConsole from "node:console";
import { skipCSRFCheck } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import { authHandler, initAuthConfig } from "@hono/auth-js";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { hash, verify } from "argon2";
import { Hono } from "hono";
import { contextStorage } from "hono/context-storage";
import { cors } from "hono/cors";
import { proxy } from "hono/proxy";
import { bodyLimit } from "hono/body-limit";
import { requestId } from "hono/request-id";
import { serializeError } from "serialize-error";
import ws from "ws";
import NeonAdapter from "./adapter";
import { getHTMLForErrorPage } from "./get-html-for-error-page";
import { isAuthAction } from "./is-auth-action";
import { API_BASENAME, api } from "./route-builder";

neonConfig.webSocketConstructor = ws;

const als = new AsyncLocalStorage<{ requestId: string }>();

for (const method of ["log", "info", "warn", "error", "debug"] as const) {
  const original = nodeConsole[method].bind(console);
  console[method] = (...args: unknown[]) => {
    const requestId = als.getStore()?.requestId;
    if (requestId) {
      original(`[traceId:${requestId}]`, ...args);
    } else {
      original(...args);
    }
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = NeonAdapter(pool);

export function createApp() {
  const app = new Hono();

  app.use("*", requestId());

  app.use("*", (c, next) => {
    const requestId = c.get("requestId");
    return als.run({ requestId }, () => next());
  });

  app.use(contextStorage());

  // Association responses use verified store signing identities supplied at release.
  app.get("/.well-known/assetlinks.json", (c) => {
    const fingerprints = (process.env.ANDROID_SIGNING_CERT_SHA256 || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      !fingerprints.length ||
      fingerprints.some((s) => !/^([A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(s))
    )
      return c.json({ error: "App links are not configured" }, 503);
    return c.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.heathlandlinks.app",
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ]);
  });
  app.get("/.well-known/apple-app-site-association", (c) => {
    // Public, verified Apple team for this app; deployments may override it.
    const team = process.env.IOS_TEAM_ID || "G76V639A9J";
    if (!team || !/^[A-Z0-9]{10}$/.test(team))
      return c.json({ error: "Universal links are not configured" }, 503);
    return c.json({
      applinks: {
        apps: [],
        details: [
          {
            appID: `${team}.com.heathlandlinks.app`,
            paths: ["/course/*", "/feed/*", "/lists/*"],
          },
        ],
      },
    });
  });

  app.onError((err, c) => {
    if (c.req.method !== "GET") {
      return c.json(
        {
          error: "An error occurred in your app",
          details: serializeError(err),
        },
        500,
      );
    }
    return c.html(getHTMLForErrorPage(err), 200);
  });

  if (process.env.CORS_ORIGINS) {
    app.use(
      "/*",
      cors({
        origin: process.env.CORS_ORIGINS.split(",").map((origin) =>
          origin.trim(),
        ),
      }),
    );
  }

  for (const method of ["post", "put", "patch"] as const) {
    app[method](
      "*",
      bodyLimit({
        maxSize: 4.5 * 1024 * 1024,
        onError: (c) => {
          return c.json({ error: "Body size limit exceeded" }, 413);
        },
      }),
    );
  }

  if (process.env.AUTH_SECRET) {
    app.use(
      "*",
      initAuthConfig((c) => ({
        secret: c.env.AUTH_SECRET ?? process.env.AUTH_SECRET,
        basePath: "/api/auth",
        trustHost: true,
        pages: {
          signIn: "/account/signin",
          signOut: "/account/logout",
        },
        skipCSRFCheck,
        session: {
          strategy: "jwt",
        },
        callbacks: {
          session({ session, token }) {
            if (token.sub) {
              session.user.id = token.sub;
            }
            return session;
          },
        },
        cookies: {
          csrfToken: {
            options: {
              secure: (process.env.AUTH_URL ?? "").startsWith("https"),
              sameSite: (process.env.AUTH_URL ?? "").startsWith("https")
                ? "none"
                : "lax",
            },
          },
          sessionToken: {
            options: {
              secure: (process.env.AUTH_URL ?? "").startsWith("https"),
              sameSite: (process.env.AUTH_URL ?? "").startsWith("https")
                ? "none"
                : "lax",
            },
          },
          callbackUrl: {
            options: {
              secure: (process.env.AUTH_URL ?? "").startsWith("https"),
              sameSite: (process.env.AUTH_URL ?? "").startsWith("https")
                ? "none"
                : "lax",
            },
          },
        },
        providers: [
          ...(process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_CREATE_ENV === "DEVELOPMENT"
            ? [
                Credentials({
                  id: "dev-social",
                  name: "Development Social Sign-in",
                  credentials: {
                    email: { label: "Email", type: "email" },
                    name: { label: "Name", type: "text" },
                    provider: { label: "Provider", type: "text" },
                  },
                  authorize: async (credentials) => {
                    const { email, name, provider } = credentials;
                    if (!email || typeof email !== "string") return null;

                    const existing = await adapter.getUserByEmail(email);
                    if (existing) return existing;

                    const allowedProviders = new Set([
                      "google",
                      "facebook",
                      "twitter",
                      "apple",
                    ]);
                    const providerName =
                      typeof provider === "string" &&
                      allowedProviders.has(provider.toLowerCase())
                        ? provider.toLowerCase()
                        : "google";
                    const newUser = await adapter.createUser({
                      emailVerified: null,
                      email,
                      name:
                        typeof name === "string" && name.length > 0
                          ? name
                          : undefined,
                    });
                    await adapter.linkAccount({
                      type: "oauth",
                      userId: newUser.id,
                      provider: providerName,
                      providerAccountId: `dev-${newUser.id}`,
                    });
                    return newUser;
                  },
                }),
              ]
            : []),
          Credentials({
            id: "credentials-signin",
            name: "Credentials Sign in",
            credentials: {
              email: {
                label: "Email",
                type: "email",
              },
              password: {
                label: "Password",
                type: "password",
              },
            },
            authorize: async (credentials) => {
              const { email, password } = credentials;
              if (!email || !password) return null;
              if (typeof email !== "string" || typeof password !== "string") {
                return null;
              }

              const user = await adapter.getUserByEmail(email);
              if (!user) return null;
              const matchingAccount = user.accounts.find(
                (account) => account.provider === "credentials",
              );
              const accountPassword = matchingAccount?.password;
              if (!accountPassword) return null;

              const isValid = await verify(accountPassword, password);
              if (!isValid) return null;
              return user;
            },
          }),
          Credentials({
            id: "credentials-signup",
            name: "Credentials Sign up",
            credentials: {
              email: {
                label: "Email",
                type: "email",
              },
              password: {
                label: "Password",
                type: "password",
              },
              name: { label: "Name", type: "text" },
              image: { label: "Image", type: "text", required: false },
            },
            authorize: async (credentials) => {
              const { password, name, image } = credentials;
              const email = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
              if (!email || !password) return null;
              if (typeof email !== "string" || typeof password !== "string") {
                return null;
              }
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 1024) return null;

              const user = await adapter.getUserByEmail(email);
              if (!user) {
                const newUser = await adapter.createUser({
                  emailVerified: null,
                  email,
                  name:
                    typeof name === "string" && name.length > 0
                      ? name
                      : undefined,
                  image:
                    typeof image === "string" && image.length > 0
                      ? image
                      : undefined,
                });
                await adapter.linkAccount({
                  extraData: {
                    password: await hash(password),
                  },
                  type: "credentials",
                  userId: newUser.id,
                  providerAccountId: newUser.id,
                  provider: "credentials",
                });
                return newUser;
              }
              return null;
            },
          }),
        ],
      })),
    );
  }

  app.all("/integrations/:path{.+}", async (c) => {
    const queryParams = c.req.query();
    const url = `${process.env.NEXT_PUBLIC_CREATE_BASE_URL ?? "https://www.create.xyz"}/integrations/${c.req.param("path")}${Object.keys(queryParams).length > 0 ? `?${new URLSearchParams(queryParams).toString()}` : ""}`;

    return proxy(url, {
      method: c.req.method,
      body: c.req.raw.body ?? null,
      // @ts-expect-error -- duplex required for streaming
      duplex: "half",
      redirect: "manual",
      headers: {
        ...c.req.header(),
        "X-Forwarded-For": process.env.NEXT_PUBLIC_CREATE_HOST,
        "x-createxyz-host": process.env.NEXT_PUBLIC_CREATE_HOST,
        Host: process.env.NEXT_PUBLIC_CREATE_HOST,
        "x-createxyz-project-group-id":
          process.env.NEXT_PUBLIC_PROJECT_GROUP_ID,
      },
    });
  });

  const handleCreateUpload = async (c: any) => {
    try {
      const { handleUploadRequest } =
        await import("../src/app/api/utils/upload.js");
      return await handleUploadRequest(c.req.raw);
    } catch (error) {
      console.error("Upload error:", error);
      const statusCode = (error as { status?: number })?.status;
      const status =
        statusCode === 400 || statusCode === 413 || statusCode === 429
          ? statusCode
          : 500;
      return c.json(
        { error: (error as Error).message || "Upload failed" },
        status,
      );
    }
  };
  app.post("/_create/api/upload", handleCreateUpload);
  app.post("/_create/api/upload/", handleCreateUpload);

  app.use("/api/auth/*", async (c, next) => {
    if (isAuthAction(c.req.path)) {
      return authHandler()(c, next);
    }
    return next();
  });
  app.route(API_BASENAME, api);

  return app;
}
