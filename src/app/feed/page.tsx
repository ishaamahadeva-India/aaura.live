import { FeedClient } from "@/app/components/FeedClient";

// ✅ PURE SERVER COMPONENT - No hooks, no client-side code
export default function FeedPage() {
  return <FeedClient />;
}
