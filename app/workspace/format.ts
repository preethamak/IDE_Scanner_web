import type { Member, WatchItem } from "@/app/workspace/types";
import type { QueueDecision } from "@/lib/teamDecisionQueue";

export function formatWorkspaceTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}
export function initials(value: string) {
  return (
    value
      .split(/[\s.@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "GR"
  );
}
export function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
export function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
export function roleName(role: string) {
  return role === "owner"
    ? "Workspace owner"
    : role === "admin"
      ? "Administrator"
      : role === "analyst"
        ? "Security analyst"
        : "Viewer";
}
export function memberName(member: Member) {
  const profile = Array.isArray(member.profiles)
    ? member.profiles[0]
    : member.profiles;
  return profile?.display_name || "Team member";
}
export function memberLabel(members: Member[], id: string) {
  return memberName(
    members.find((member) => member.user_id === id) || {
      user_id: id,
      role: "viewer",
    },
  );
}

export function decisionScan(
  decision: QueueDecision,
): Record<string, unknown> | null {
  if (Array.isArray(decision.scans)) return decision.scans[0] || null;
  return decision.scans && typeof decision.scans === "object"
    ? decision.scans
    : null;
}
export function watchName(item: WatchItem) {
  const data = Array.isArray(item.extensions)
    ? item.extensions[0]
    : item.extensions;
  return data?.display_name || item.extension_id;
}
