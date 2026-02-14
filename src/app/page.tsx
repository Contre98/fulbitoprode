import { HomeScreen } from "@/components/home/HomeScreen";
import { requireServerAuth } from "@/lib/server-auth";

export default async function Page() {
  await requireServerAuth();
  return <HomeScreen />;
}
