import type { Metadata } from "next";
import AnalyzePage from "@/app/analyze/AnalyzePage";

export const metadata: Metadata = {
  title: "Analyze",
  description:
    "Choose the right analysis boundary: search a published extension, inventory installed editors, or import a portable report bundle.",
  alternates: { canonical: "/analyze" },
};

export default AnalyzePage;
