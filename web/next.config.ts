import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // Include parent dir so standalone output traces ../lib/* runtime imports
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
