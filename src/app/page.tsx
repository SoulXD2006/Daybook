import { auth } from "@/lib/auth";
import { TodayView } from "@/components/today-view";
import { Landing } from "@/components/landing";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) return <Landing />;

  return <TodayView userName={session.user.name?.split(" ")[0] ?? undefined} />;
}
