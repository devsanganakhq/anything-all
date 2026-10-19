// Opt-in build target owned by the client. The default retains the legacy EAS
// project until release ownership/signing is reconciled. Both native update
// configurations disable OTA updates; this does not redirect installed apps.
module.exports = ({ config }) =>
  process.env.HEATHLAND_CLIENT_PROJECT === "1"
    ? {
        ...config,
        owner: "heathlandlinkss-team",
        slug: "heathland-links",
        extra: {
          ...config.extra,
          eas: {
            ...config.extra?.eas,
            projectId: "e0fb8315-39d2-4caa-98b3-194111bb0d1e",
          },
        },
      }
    : config;
