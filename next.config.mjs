/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained server bundle in .next/standalone for Docker.
  output: "standalone",
};

export default nextConfig;
