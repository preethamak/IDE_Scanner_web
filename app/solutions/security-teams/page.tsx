import type { Metadata } from "next";
import SolutionPage from "../SolutionPage";
import { solutions } from "../data";

export const metadata: Metadata = {
  title: "For security teams",
  description:
    "Prioritize review with capabilities and findings while preserving coverage gaps, exact artifact identities, and the limits of each conclusion.",
  alternates: { canonical: "/solutions/security-teams" },
};

export default function Page() {
  return <SolutionPage solution={solutions.security} />;
}
