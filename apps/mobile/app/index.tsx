import { Redirect, type Href } from "expo-router";

import { useAuthSession } from "@/features/auth-session";
import { HomePage } from "@/pages/home";

const loginRoute = "/login" as Href;
const nicknameRoute = "/onboarding/nickname" as Href;

export default function IndexRoute() {
  const { status, user } = useAuthSession();

  if (status === "restoring") {
    return null;
  }

  if (status === "unauthenticated") {
    return <Redirect href={loginRoute} />;
  }

  if (status === "authenticated" && !user?.nickname) {
    return <Redirect href={nicknameRoute} />;
  }

  return <HomePage />;
}
