import "server-only";

import { cookies } from "next/headers";
import { userFromSession } from "@/lib/cloudflarePrivate";

export async function cloudflareSessionActive(): Promise<boolean> {
  try {
    const cookieHeader = (await cookies())
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    return Boolean(
      await userFromSession(
        new Request("https://abscissa.dev", {
          headers: { cookie: cookieHeader },
        }),
      ),
    );
  } catch {
    return false;
  }
}
