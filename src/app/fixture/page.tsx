import { requireServerAuth } from "@/lib/server-auth";
import FixturePageClient from "@/app/fixture/FixturePageClient";

export default async function FixturePage() {
  await requireServerAuth();
  return <FixturePageClient />;
}
