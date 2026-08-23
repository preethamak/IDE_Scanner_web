import type { Metadata } from "next";
import SolutionPage from "../SolutionPage";
import { solutions } from "../data";

export const metadata: Metadata = {
  title: "For engineering teams",
  description:
    "Give every meaningful release change an owner, due date, rationale, notification path, and exportable audit record.",
  alternates: { canonical: "/solutions/engineering-teams" },
};

export default function Page() {
  return <SolutionPage solution={solutions.teams} />;
}
