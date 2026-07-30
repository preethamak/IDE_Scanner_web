import { notFound } from "next/navigation";
import InvitationAcceptance from "@/app/InvitationAcceptance";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  return <InvitationAcceptance token={token} />;
}
