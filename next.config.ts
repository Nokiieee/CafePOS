import type { NextConfig } from "next";

// The project's address, from .env (Next reads .env before this file).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Menu photos uploaded on the Menu page live in Supabase Storage
    // (supabase/menu-photos.sql). next/image only shows outside pictures
    // from addresses listed here: just that one bucket.
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/menu-photos/**`)]
      : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
