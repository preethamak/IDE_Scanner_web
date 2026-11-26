import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync } from "node:fs";
import { adminSections } from "@/lib/admin/catalog";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/admin/access", () => ({ adminRole: async () => "owner", requireAdminPage: async () => ({ id: "operator", email: "operator@example.test" }) }));
vi.mock("@/lib/admin/data", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/admin/data")>(), readAdminData: mocks.read }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/users", useRouter: () => ({ refresh() {} }), notFound: () => { throw new Error("not found"); } }));
import AdminPage from "./[[...section]]/page";
import AdminLayout from "./layout";

describe("admin rendering", () => {
  it("renders all sections, empty data, and configuration failures without exposing internals", async () => {
    mocks.read.mockResolvedValue({ columns: ["dimension", "events"], rows: [], next: false, metrics: [], daily: [] });
    for (const section of adminSections) {
      const page = await AdminPage({ params: Promise.resolve({ section: section.key.split("/") }), searchParams: Promise.resolve({}) });
      const html = renderToStaticMarkup(page);
      expect(html).toContain(section.title.replaceAll("&", "&amp;")); expect(html).toContain("No records for this selection");
    }
    mocks.read.mockRejectedValue(new Error("private database DSN"));
    const failure = renderToStaticMarkup(await AdminPage({ params: Promise.resolve({ section: ["users"] }), searchParams: Promise.resolve({}) }));
    expect(failure).toContain("Connection needs attention"); expect(failure).not.toContain("private database DSN");
  });
  it("renders recorded metrics and exports a temporary layout for visual inspection", async () => {
    mocks.read.mockResolvedValue({ columns: ["dimension", "events", "sessions", "signed_in_users"], rows: [{ dimension: "2026-11-25", events: 24, sessions: 18, signed_in_users: 3 }, { dimension: "2026-11-24", events: 31, sessions: 21, signed_in_users: 4 }], next: false, metrics: [{ label: "Events", value: 55 }, { label: "Visitor sessions", value: 39 }, { label: "Signed-in users", value: 7 }], daily: Array.from({ length: 30 }, (_, index) => ({ day: `2026-11-${String(index + 1).padStart(2, "0")}`, value: index % 5 * 9 })), note: "Synthetic test records for layout verification." });
    const page = await AdminPage({ params: Promise.resolve({ section: ["users"] }), searchParams: Promise.resolve({}) });
    const layout = await AdminLayout({ children: page });
    const html = renderToStaticMarkup(createElement("div", {}, layout));
    expect(html).toContain("24"); expect(html).toContain("Daily event count");
    // Local intermediate only; never checked in or served by the app.
    if (process.env.ADMIN_VISUAL_FIXTURE) writeFileSync(process.env.ADMIN_VISUAL_FIXTURE, `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}${readFileSync("app/admin/admin.css", "utf8")}</style></head><body>${html}</body></html>`);
  });
});
