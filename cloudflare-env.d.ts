declare namespace Cloudflare {
  interface Env {
    RIOT_API_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
