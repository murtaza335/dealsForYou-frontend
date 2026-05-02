import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const workspaceRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
