import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server output for containers (Cloud Run, etc.).
  output: "standalone",
};

export default nextConfig;
