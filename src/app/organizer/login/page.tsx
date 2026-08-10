import type { Metadata } from "next";
import { LoginForm } from "@/features/organizer-auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Organizer sign in | Weft",
  description: "Sign in to your Weft organizer account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
