import { auth } from "@/auth";
import { isEmailAllowed } from "@/lib/allowed-emails";

export type AuthUser = {
  email: string;
  name: string;
};

/** Server Actions / Route Handlers 用。未ログイン・許可外は Error を投げる。 */
export async function requireUser(): Promise<AuthUser> {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email || !isEmailAllowed(email) || !session?.user) {
    throw new Error("Unauthorized");
  }

  return {
    email,
    name: session.user.name?.trim() || email,
  };
}
