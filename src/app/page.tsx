
import { redirect } from "next/navigation";

export default function Home() {
  // Simple redirect to dashboard for this MVP version
  redirect("/dashboard");
}
