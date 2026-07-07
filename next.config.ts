import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second `next dev` instance run against this same project without
  // hitting Next's "another dev server is already running" lock, by pointing
  // it at a separate dist dir. See docs/dev-multiple-instances.md.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
