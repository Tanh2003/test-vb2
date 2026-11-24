import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["10.204.36.69"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
   logging: {
    browserToTerminal: false, // Tắt in cảnh báo [browser] ra terminal
  },
// Ép Next.js biên dịch lại các thư viện gây xung đột ESM/CommonJS
  transpilePackages: ['jwks-rsa', 'jose'],
};


export default nextConfig;
