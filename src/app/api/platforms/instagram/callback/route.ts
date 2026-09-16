import { completeOAuthFlow } from "@/lib/oauth-flow";

export async function GET(req: Request) {
  return completeOAuthFlow("INSTAGRAM", req);
}
