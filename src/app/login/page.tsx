import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <AuthForm mode="login" next={next} callbackError={error === "auth_callback"} />;
}
