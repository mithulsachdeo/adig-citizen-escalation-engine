/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deployed on Vercel: static/client pages + one serverless route (/api/narrative).
  // Not `output: 'export'` — that would drop the serverless function we need for the LLM proxy.
};

export default nextConfig;
