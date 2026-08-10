import type { Metadata } from "next";
import { RegisterFlow } from "@/features/organizer-auth/components/RegisterFlow";

export const metadata: Metadata = {
  title: "Create an organizer account | Weft",
  description: "Create your Weft organizer account.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterFlow />;
}
