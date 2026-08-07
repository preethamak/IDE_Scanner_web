import {
  BellRing,
  Bot,
  Braces,
  ClipboardCheck,
  Code2,
  FileDiff,
  Fingerprint,
  Network,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Solution } from "./SolutionPage";
export const solutions = {
  developers: {
    eyebrow: "For developers",
    title: "Know what joins",
    emphasis: "your editor.",
    intro:
      "Check an extension before installation, compare the next release, and keep useful capabilities separate from unsupported security conclusions.",
    icon: Code2,
    promise: "A clear install decision",
    outcomes: [
      {
        icon: Fingerprint,
        title: "Exact release identity",
        detail:
          "Version and artifact evidence stay visible instead of collapsing into publisher reputation.",
      },
      {
        icon: FileDiff,
        title: "Readable permission change",
        detail:
          "See newly observed file, terminal, network, secret, editor, and agent capabilities.",
      },
      {
        icon: Braces,
        title: "Local-first inventory",
        detail:
          "Use the CLI to create a portable report without uploading local extension files by default.",
      },
    ],
    steps: [
      {
        title: "Search",
        detail: "Find the published extension and select the exact release.",
      },
      {
        title: "Inspect",
        detail:
          "Read capability, freshness, coverage, and immutable findings together.",
      },
      {
        title: "Monitor",
        detail:
          "Keep the approved baseline visible when a new version arrives.",
      },
    ],
    cta: "Check the next extension before installing it.",
    href: "/registry",
  },
  teams: {
    eyebrow: "For engineering teams",
    title: "Turn extension updates into",
    emphasis: "owned review work.",
    intro:
      "Give every meaningful release change an owner, due date, rationale, notification path, and exportable audit record.",
    icon: Users,
    promise: "One shared release decision",
    outcomes: [
      {
        icon: ClipboardCheck,
        title: "Assigned review",
        detail:
          "Route exact releases to a teammate instead of losing decisions in chat.",
      },
      {
        icon: BellRing,
        title: "Useful notifications",
        detail:
          "Deliver release changes through tested channels and weekly digests.",
      },
      {
        icon: ScrollText,
        title: "Defensible history",
        detail:
          "Export role-aware audit events and decision receipts as CSV or JSON.",
      },
    ],
    steps: [
      {
        title: "Monitor",
        detail: "Add the extension and anchor the currently accepted baseline.",
      },
      {
        title: "Review",
        detail: "Assign the new exact release with context and a due date.",
      },
      {
        title: "Record",
        detail: "Allow, block, or grant an exception with required rationale.",
      },
    ],
    cta: "Create a review workflow your team can revisit.",
    href: "/workspace",
  },
  security: {
    eyebrow: "For security teams",
    title: "Replace extension guesswork with",
    emphasis: "version-bound evidence.",
    intro:
      "Prioritize review with capabilities and findings while preserving coverage gaps, exact identities, and the limits of each conclusion.",
    icon: ShieldCheck,
    promise: "Evidence that survives review",
    outcomes: [
      {
        icon: Fingerprint,
        title: "Artifact boundary",
        detail:
          "Every public result identifies the package version, hash, scanner, and ruleset.",
      },
      {
        icon: ScrollText,
        title: "Audit export",
        detail:
          "Filter and export workspace decisions without exposing delivery credentials.",
      },
      {
        icon: Network,
        title: "Policy direction",
        detail:
          "Prepare for brokered file, command, network, and secret controls without claiming the native runtime exists.",
      },
    ],
    steps: [
      {
        title: "Inventory",
        detail:
          "Collect installed extensions locally or begin from a monitored registry list.",
      },
      {
        title: "Triage",
        detail:
          "Separate privileged capability, correlated evidence, and incomplete coverage.",
      },
      {
        title: "Prove",
        detail: "Retain the exact report and the team decision that followed.",
      },
    ],
    cta: "Build an exact-release extension inventory.",
    href: "/analyze",
  },
  agents: {
    eyebrow: "For AI-agent security",
    title: "Give autonomous tools",
    emphasis: "less ambient authority.",
    intro:
      "Explore the permission model for files, commands, network destinations, secrets, tools, and delegation before the native runtime is built.",
    icon: Bot,
    promise: "Capability before execution",
    outcomes: [
      {
        icon: FileDiff,
        title: "Patch-first writes",
        detail:
          "The runtime target makes agent changes reviewable before applying them.",
      },
      {
        icon: Network,
        title: "Brokered destinations",
        detail:
          "Network access is designed around explicit destinations rather than ambient egress.",
      },
      {
        icon: Bot,
        title: "Delegation visibility",
        detail:
          "Agents and tools keep distinct principals so authority cannot silently expand.",
      },
    ],
    steps: [
      {
        title: "Select a principal",
        detail:
          "Identify the agent, extension, or delegated tool making the request.",
      },
      {
        title: "Describe the grant",
        detail: "Bind capability, action, resource, workspace, and expiration.",
      },
      {
        title: "Audit the result",
        detail:
          "Record allow, deny, or prompt with a stable reason and policy version.",
      },
    ],
    cta: "Explore the GuardRails permission prototype.",
    href: "/ide",
  },
} satisfies Record<string, Solution>;
