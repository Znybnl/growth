import { GET as dispatchNotifications } from "@/app/api/internal/gain-notifications/route";

export const maxDuration = 300;

// Dedicated recovery pass: never calls maintenance or its purge operations.
// The SQL local cutoff excludes the upcoming French morning digest.
export async function GET(request: Request) {
  return dispatchNotifications(request);
}
