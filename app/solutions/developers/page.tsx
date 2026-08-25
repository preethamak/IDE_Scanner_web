import type { Metadata } from "next";
import SolutionPage from "../SolutionPage";
import { solutions } from "../data";

export const metadata: Metadata = {
  title: "For developers",
  description:
    "Check an extension before installation, compare the next release, and keep useful capabilities separate from unsupported security conclusions.",
  alternates: { canonical: "/solutions/developers" },
};

export default function Page() {
  return <SolutionPage solution={solutions.developers} />;
}
