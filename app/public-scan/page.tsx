import { permanentRedirect } from "next/navigation";

export default function PublicScanCompatibilityRedirect() {
  permanentRedirect("/registry");
}
