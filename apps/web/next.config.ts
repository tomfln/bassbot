import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // Include monorepo root so standalone output traces packages/lib/* runtime imports
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
