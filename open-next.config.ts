import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Keep the first Cloudflare deployment stateless. Supabase remains the source
// of truth for application data and authentication; Cloudflare cache storage
// can be added later once R2 is enabled for this account.
export default defineCloudflareConfig();
