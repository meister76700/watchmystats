import { startOAuthFlow } from "@/lib/oauth-flow";

export async function GET() {
  return startOAuthFlow("INSTAGRAM");
}
