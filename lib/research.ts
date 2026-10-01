export type ResearchArticle = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  published: string;
  reading: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  sources?: Array<{ label: string; href: string }>;
};
export const researchArticles: ResearchArticle[] = [
  {
    slug: "redhat-fabric8-analytics-false-positive",
    category: "Case study",
    title: "Red Hat Fabric8 Analytics: when a malware label was not enough",
    summary:
      "An exact Marketplace scan produced a critical dependency block. Artifact verification showed that the matched npm version was a reserved security placeholder, so GuardRails narrowed the rule instead of publishing a false accusation.",
    published: "1 October 2026",
    reading: "3 min read",
    sections: [
      {
        heading: "The initial result",
        paragraphs: [
          "The case is redhat.fabric8-analytics 1.1.0, acquired from the Visual Studio Marketplace and bound to VSIX SHA-256 ea3c3cb87b89be1e0cebf198a743be5b89882b7f2c2bb1269ec1423815e57a41. The first production scan returned BLOCK with a confirmed-malicious outcome because the packaged dependency graph contained fs@0.0.1-security and OSV matched MAL-2025-21003.",
          "That result was serious, but the label was not the conclusion. A dependency intelligence match is only as trustworthy as its package and version semantics. We stopped before calling the Red Hat extension malicious.",
        ],
      },
      {
        heading: "The verification step",
        paragraphs: [
          "The exact npm metadata describes fs@0.0.1-security as a name held by npm to prevent malicious use and points to npm's security-holder repository. The published archive contains package metadata and a README, not executable JavaScript, install hooks, or dependencies. The repository describes the package as a placeholder published after the original package was removed.",
          "The OSV record still describes the package as malicious across an unrestricted range. The Open Source Security Foundation tracker now has an open false-positive report for this exact version, documenting the mismatch between the advisory range and npm's reserved placeholder. This does not prove that every historical fs release is safe; it does prove that this exact package/version needed separate treatment.",
        ],
      },
      {
        heading: "The correction",
        paragraphs: [
          "GuardRails now excludes only the exact triple fs, 0.0.1-security, and MAL-2025-21003 from the malware classification. The malware rule remains active for other package versions and other MAL records. This is a narrow evidence correction, not a global allowlist for a package name.",
          "The change passed the full production gate and fresh labelled holdout in scanner build 781a5be27fb4fa22326ce8523ca0bfd2dfcd15ab. The 250-release replacement cohort is being rescanned under that build before publication, so the registry does not carry the original false-positive decision forward.",
        ],
      },
      {
        heading: "Why this belongs in a security product",
        paragraphs: [
          "A scanner earns trust by being willing to reverse a bad conclusion. The right outcome here is not a dramatic headline about a well-known publisher; it is a reproducible artifact boundary, a specific upstream data error, a minimal rule change, and a release gate that must pass again.",
          "We do not present redhat.fabric8-analytics 1.1.0 as confirmed malware on the basis of this dependency match. Other static capabilities may still merit review, but the evidence available here does not support a malicious verdict.",
        ],
      },
    ],
    sources: [
      {
        label: "OSV: MAL-2025-21003",
        href: "https://osv.dev/vulnerability/MAL-2025-21003",
      },
      {
        label: "npm metadata for fs@0.0.1-security",
        href: "https://registry.npmjs.org/fs/0.0.1-security",
      },
      {
        label: "npm security-holder repository",
        href: "https://github.com/npm/security-holder",
      },
      {
        label: "OSSF false-positive report",
        href: "https://github.com/ossf/malicious-packages/issues/1560",
      },
    ],
  },
  {
    slug: "bcai-rosetta-exact-artifact",
    category: "Case study",
    title: "BCAI Rosetta: an exact artifact, not a reputation score",
    summary:
      "GuardRails reproduced an independently reported malicious Open VSX release and kept the static-only and authoritative decisions separate.",
    published: "19 September 2026",
    reading: "3 min read",
    sections: [
      {
        heading: "The artifact boundary",
        paragraphs: [
          "The release was bingcha.bcai-tools 4.0.37. GuardRails retains the exact VSIX and binds every result to SHA-256 b1b9785cdc7be479061f121f282391fba9be013d896d9a54f395621634709216, rather than relying on the publisher name or a moving latest version.",
          "Knostic independently reported the release as malicious, describing Google OAuth refresh-token theft, broad Google Cloud access, and proxying through attacker-controlled infrastructure. GuardRails reproduces and corroborates that report; this page does not claim GuardRails discovered the campaign first.",
        ],
      },
      {
        heading: "What the scanner says without the advisory",
        paragraphs: [
          "With the exact-hash threat intelligence removed, the current ruleset routed the artifact to REVIEW with risk score 57 and malware score 0. It identified a high-specificity remote-credential-broker exposure plus contextual credential prompts, network access, filesystem access, process execution, and broad activation. The score is a diagnostic index, not a probability of compromise.",
          "That is the intended boundary. Static evidence can establish a suspicious trust boundary and justify human review; it does not automatically prove that every described token was exfiltrated or that a runtime path executed.",
        ],
      },
      {
        heading: "What changes with authoritative evidence",
        paragraphs: [
          "When the independently sourced advisory matches the exact artifact hash, the same release becomes BLOCK with a malicious verdict, malware score 100, and confirmed-threat outcome. The block is attributable to exact artifact intelligence, not to a pile of ordinary IDE capabilities.",
          "This separation makes the result auditable: reviewers can distinguish behavior evidence, provenance, runtime limitations, and authoritative intelligence instead of receiving one opaque AI-generated risk score.",
        ],
      },
      {
        heading: "What this proves",
        paragraphs: [
          "This case demonstrates two product behaviors that matter in production: GuardRails does not inflate ordinary agent or developer-tool capabilities into malware, and it can enforce a verified exact-artifact block when independent evidence exists.",
          "It is not an ecosystem accuracy claim and it is not a substitute for the fresh labelled holdout. Public registry expansion still requires the separate accuracy gate and deep runtime contract.",
        ],
      },
    ],
    sources: [
      {
        label: "Knostic: Agentic Threat Intelligence Feed — VS Code Extensions",
        href: "https://www.knostic.ai/blog/agentic-threat-intelligence-feed-vs-code-extensions",
      },
      {
        label: "Open VSX artifact record",
        href: "https://open-vsx.org/extension/bingcha/bcai-tools",
      },
    ],
  },
  {
    slug: "edrtester-1-0-4-exact-artifact",
    category: "Case study",
    title: "EDR Tester 1.0.4: a real malicious release at the byte boundary",
    summary:
      "GuardRails binds a public Codelake report to the exact Marketplace artifact while keeping corroboration separate from a first-discovery claim.",
    published: "23 September 2026",
    reading: "3 min read",
    sections: [
      {
        heading: "The exact release",
        paragraphs: [
          "The case is AzureCdnInfo.edrtester 1.0.4, bound to Marketplace VSIX SHA-256 d4101a5bc86747f499ef347548e92eb3e1b09ce6acaf34bd1ee07f66400b18af. GuardRails stores the publisher, version, registry source, and digest together; a later release must earn its own decision.",
          "Codelake Research reported host and Active Directory reconnaissance, beaconing, and dormant reverse-shell capability for this exact release. That report is the source of record for the label; the GuardRails holdout retains the official Marketplace acquisition URL and verifies the downloaded bytes before analysis.",
        ],
      },
      {
        heading: "What GuardRails can claim",
        paragraphs: [
          "With the verified exact-hash advisory, the release is a BLOCK/MALICIOUS outcome attributable to authoritative intelligence. A separate behavior-only replay is required before any public statement says static or runtime rules independently detected the behavior; an advisory match alone is not a discovery claim.",
          "This distinction is deliberate. The real security value is the immutable release decision and the ability to reproduce it against the exact artifact, while the evidence boundary prevents an existing public report from being relabeled as an original GuardRails discovery.",
        ],
      },
      {
        heading: "Why this belongs in the product",
        paragraphs: [
          "A publisher name, install count, or a clean prior release cannot establish that the bytes installed today are safe. This case demonstrates the registry decision GuardRails is designed to provide: exact artifact identity, source-backed evidence, coverage status, and a reason that can be independently checked.",
          "The case is corroboration and reproduction material, not an ecosystem accuracy claim. Public registry expansion still requires the fresh labelled holdout, behavior-only shadow gate, and deep runtime contract to pass.",
        ],
      },
    ],
    sources: [
      {
        label: "Codelake Research advisory CLR-2026-3045",
        href: "https://research.codelake.dev/advisories/clr-2026-3045-edrtester/",
      },
      {
        label: "Visual Studio Marketplace listing",
        href: "https://marketplace.visualstudio.com/items?itemName=AzureCdnInfo.edrtester",
      },
    ],
  },
  {
    slug: "nx-console-18-95-0",
    category: "Case study",
    title: "Nx Console 18.95.0: block the exact compromised release",
    summary:
      "GuardRails binds an independently reported supply-chain compromise to the exact VSIX hash while keeping the adjacent clean release separate.",
    published: "19 September 2026",
    reading: "2 min read",
    sections: [
      {
        heading: "The release boundary",
        paragraphs: [
          "The case is nrwl.angular-console 18.95.0, bound to VSIX SHA-256 1a4afce34918bdc74ae3f31edaffffaa0ee074d83618f53edfd88137927340b8. The maintainer advisory identifies that release as compromised, and an independent report publishes the same artifact hash.",
          "GuardRails does not generalize the incident from a publisher name. The adjacent 18.94.0 release is retained as a separate safe control, so the policy decision is tied to the exact bytes and version.",
        ],
      },
      {
        heading: "What GuardRails does",
        paragraphs: [
          "The verified exact-hash advisory maps to known-malicious-extension and a BLOCK/MALICIOUS outcome. The report preserves the advisory, artifact hash, version, and complete-analysis requirement so a security team can reproduce the reason for the decision.",
          "The malicious bytes are acquired and replayed by the publication holdout workflow; they are not committed to the application repository. This page documents exact-artifact corroboration, not an original discovery claim.",
        ],
      },
      {
        heading: "What this proves",
        paragraphs: [
          "A security product should distinguish a compromised release from a trusted publisher and should not silently carry an approval from one version to the next. GuardRails makes that distinction explicit and keeps the evidence attached to the release under review.",
        ],
      },
    ],
    sources: [
      {
        label: "Nx Console maintainer advisory",
        href: "https://github.com/nrwl/nx-console/security/advisories/GHSA-c9j4-9m59-847w",
      },
      {
        label: "Phoenix Security independent artifact report",
        href: "https://phoenix.security/vs-code-extension-malware-github-breach-teampcp-2026/",
      },
    ],
  },
  {
    slug: "code-runner-cve-2025-65715",
    category: "Case study",
    title:
      "Code Runner 0.12.2: block the vulnerability, do not call it malware",
    summary:
      "GuardRails binds a published Code Runner vulnerability to the exact VSIX and separates an enterprise block decision from a malware verdict.",
    published: "19 September 2026",
    reading: "2 min read",
    sections: [
      {
        heading: "The exact release",
        paragraphs: [
          "The case is formulahendry.code-runner 0.12.2, bound to VSIX SHA-256 4c8e4aea7dd07c9c20173e71869759fb2ce2f55b9819c4b374172467af03b144. GuardRails does not substitute the latest Marketplace release or a repository checkout.",
          "CVE-2025-65715 describes arbitrary code execution through the code-runner.executorMap setting when a crafted workspace is opened. The published record rates the issue High severity with CVSS 7.8.",
        ],
      },
      {
        heading: "What GuardRails reports",
        paragraphs: [
          "The exact-hash advisory match produces BLOCK with a REVIEW verdict, malware score 0, and the known-vulnerable-extension finding. That is the correct enterprise outcome: block the affected release from an allowlist while avoiding an unsupported claim that the publisher or artifact is malware.",
          "The report retains the advisory ID, exact hash, affected version, and completed analysis state so a reviewer can reproduce why this release is blocked.",
        ],
      },
      {
        heading: "What this proves",
        paragraphs: [
          "This is a reproduction of a published vulnerability, not a GuardRails discovery claim. It demonstrates that the scanner can turn an authoritative extension CVE into a precise release decision without confusing vulnerability, capability, and malicious intent.",
        ],
      },
    ],
    sources: [
      {
        label: "NVD: CVE-2025-65715",
        href: "https://nvd.nist.gov/vuln/detail/CVE-2025-65715",
      },
      {
        label: "GitHub Advisory Database: GHSA-5g82-gg27-r8vp",
        href: "https://github.com/advisories/GHSA-5g82-gg27-r8vp",
      },
    ],
  },
  {
    slug: "solidity-pro",
    category: "Case study",
    title: "Solidity Pro: the wallet stealer behind the audit tool",
    summary:
      "GuardRails flagged credential harvesting, heavy obfuscation, and unattended remote extension updates in Solidity Pro—the same behavior documented in public reporting on the campaign.",
    published: "28 August 2026",
    reading: "3 min read",
    sections: [
      {
        heading: "The cover story",
        paragraphs: [
          "Solidity Pro presented itself as an AI-powered smart-contract auditor, gas optimiser, and developer utility. The public v3.4.0 source release carries the same familiar signals: a polished developer-tooling pitch, startup activation, and a bundle that makes the important behaviour difficult to inspect at a glance.",
          "Public threat research identified Solidity Pro packages from the helper-beeps and web3devtoolsx publishers as part of a credential-stealing campaign targeting Web3 developers. GuardRails did not discover the campaign; this case study documents what the scanner independently flagged in the public source release.",
        ],
      },
      {
        heading: "What GuardRails flagged",
        paragraphs: [
          "GuardRails produced a BLOCK decision from correlated static evidence, not from a single suspicious API. The source includes a Web3Analytics module that searches for wallet data, cloud credentials, developer tokens, SSH material, and configuration files; it then combines those collection paths with network delivery behaviour.",
          "The compiled extension bundle is heavily obfuscated. GuardRails also found an unattended remote-VSIX update chain: code that can download an extension package, write it locally, and hand it to the editor for installation without a visible integrity boundary. Those three signals together form a credible abuse path.",
        ],
      },
      {
        heading: "Why this deserved a block",
        paragraphs: [
          "Developer tools do need filesystem and network access. That alone is not the story. This release combined targeted secret collection, outbound delivery, obfuscation, and a remote update mechanism in a tool marketed for Solidity development. The result is an installation path with an unacceptable blast radius for a developer workstation.",
          "The scanner’s job is to make that decision explainable: show the behavior, the affected files, and the rule correlation. A score can help order work; it cannot replace the reason for the decision.",
        ],
      },
      {
        heading: "Technical notes",
        paragraphs: [
          "This analysis used the public web3devtoolsx/solidity-pro Git source release whose manifest identifies version 3.4.0. The original marketplace artifact was removed before this validation and is not represented as a hash-verified VSIX here.",
          "The campaign facts and historical version context are attributed to the public research below. GuardRails’ conclusion on this page is limited to the static behaviour found in the analyzed public source release.",
        ],
      },
    ],
    sources: [
      {
        label: "Yeeth Security: Solidity Pro’s WhiteCobra Chassis",
        href: "https://yeethsecurity.com/blog/2026-08-06-Solidity-Pro-WhiteCobra-C2-to-Telegram",
      },
      {
        label: "Public Solidity Pro v3.4.0 source release",
        href: "https://github.com/web3devtoolsx/solidity-pro/tree/fe794a2bdad03acf5e808eb7c8f36cfc62b8a64b",
      },
    ],
  },
  {
    slug: "gemini-code-assist-2-100-0",
    category: "Case study",
    title: "Gemini Code Assist 2.100.0: a preventive block on credential exfiltration evidence",
    summary:
      "GuardRails correlated credential collection and outbound serialization in an exact Marketplace VSIX, while keeping a preventive block separate from a confirmed-malware claim.",
    published: "1 October 2026",
    reading: "3 min read",
    sections: [
      {
        heading: "The exact artifact",
        paragraphs: [
          "The case is Google.geminicodeassist 2.100.0, acquired from the Visual Studio Marketplace and bound to VSIX SHA-256 bbb05ad583f8d3ad97560ec0b5b2e252ac6166020fd1de55bc96ae0458a24b0e. The decision applies to these bytes and this release; it is not a blanket claim about Gemini Code Assist or future versions.",
          "The production result is BLOCK with a suspicious verdict, risk score 99, and malware score 0. That combination is intentional: the evidence crossed the preventive policy boundary, but there is no independent malicious-release advisory or confirmed theft evidence attached to this artifact.",
        ],
      },
      {
        heading: "What the scanner found",
        paragraphs: [
          "The high-confidence finding is in agent/a2a-server.mjs. The code collects multiple credential families and serializes them into an outbound request. The correlation matters: collection of sensitive material is paired with a delivery sink rather than being treated as an isolated reference to an environment variable.",
          "The isolated runtime also observed a filesystem write under the analysis boundary. Runtime evidence is reported as observed capability and context; it does not imply that the scanner proved a real user's credentials were read or transmitted.",
        ],
      },
      {
        heading: "Why the language matters",
        paragraphs: [
          "Calling this release confirmed malware would overstate the evidence. The defensible conclusion is narrower: this exact artifact contains a credential-harvesting and exfiltration path that is too risky to approve without independent publisher explanation and deeper review.",
          "The result also shows why malware score and risk score are separate fields. Risk orders a high-consequence preventive decision; malware score remains zero because the scanner has not established a confirmed malicious classification from authoritative intelligence.",
        ],
      },
      {
        heading: "What this proves",
        paragraphs: [
          "An IDE extension can be blocked before a confirmed campaign report exists. That is useful for enterprise allowlisting, provided the report names the exact file, rule, evidence class, runtime boundary, and uncertainty instead of collapsing everything into an AI-generated label.",
          "This case is a GuardRails preventive detection, not a first-discovery claim about Gemini Code Assist as a product or its publisher.",
        ],
      },
    ],
    sources: [
      {
        label: "Visual Studio Marketplace listing",
        href: "https://marketplace.visualstudio.com/items?itemName=Google.geminicodeassist",
      },
    ],
  },
  {
    slug: "mysql-client-2-9-0-2",
    category: "Case study",
    title: "MySQL Client 2 9.0.2: credential collection inside a database tool",
    summary:
      "An exact Marketplace release was blocked after GuardRails correlated credential collection, outbound serialization, dynamic code, and destructive-operation indicators.",
    published: "1 October 2026",
    reading: "3 min read",
    sections: [
      {
        heading: "The exact release",
        paragraphs: [
          "The case is cweijan.vscode-mysql-client2 9.0.2, acquired from the Visual Studio Marketplace and bound to VSIX SHA-256 6f1cf09c486df860cf164365cdd8ff80c92d78014e15b10042658fbf70f5475b. The decision is for this artifact and version, not for every release of MySQL Client 2.",
          "GuardRails returned BLOCK with a suspicious verdict, risk score 99, and malware score 0. This is a preventive enterprise decision based on executable evidence, not a claim that a published malware campaign or confirmed theft has been established.",
        ],
      },
      {
        heading: "The credential path",
        paragraphs: [
          "In out/extension.js, the scanner found a high-confidence pattern that collects multiple credential families and serializes the collected material for outbound use. The finding is not based on the extension merely having database credentials in its normal configuration; it is the combination of collection behavior and an outbound serialization sink.",
          "The same artifact also contains dynamic-code and destructive-operation indicators. Those signals do not independently prove malicious intent, but they increase the consequence of a credential-handling path in a developer workstation extension.",
        ],
      },
      {
        heading: "Why this is a preventive block",
        paragraphs: [
          "A database client legitimately needs network access and may handle connection secrets. That context is why a capability-only rule would be noisy. Here, the decision comes from correlated behavior in the packed extension, not from network access alone.",
          "The malware score remains zero because the current evidence does not include an independent malicious-release advisory or proof that a user's credentials were actually stolen. The appropriate statement is that the exact release presents an unacceptable credential-exfiltration risk until the publisher can explain and remediate it.",
        ],
      },
      {
        heading: "What this proves",
        paragraphs: [
          "Preventive scanning has value before an incident report exists, but only when the report is precise about what was observed and what was not. GuardRails binds this decision to the VSIX hash, affected file, correlated rule evidence, and runtime boundary so a reviewer can reproduce the conclusion.",
          "This is a GuardRails preventive detection, not a confirmed-malware or confirmed-theft claim about the publisher or every version of MySQL Client 2.",
        ],
      },
    ],
    sources: [
      {
        label: "Visual Studio Marketplace listing",
        href: "https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-mysql-client2",
      },
    ],
  },
  {
    slug: "capability-is-not-malware",
    category: "Methodology",
    title: "Capability is not malware",
    summary:
      "Why shell, network, filesystem, and credential access need intent and correlation before they become a security conclusion.",
    published: "12 July 2026",
    reading: "2 min read",
    sections: [
      {
        heading: "Power is part of the product",
        paragraphs: [
          "Language servers launch processes. Cloud extensions make network requests. Formatters read and write files. These behaviors define useful developer tooling, but they also define the extension's blast radius.",
          "A scanner that labels every privileged API as malicious produces noise. A scanner that ignores those APIs cannot explain what the extension could do after installation.",
        ],
      },
      {
        heading: "The evidence ladder",
        paragraphs: [
          "GUARDRAILS records an isolated capability as context. Evidence becomes actionable when it adds untrusted input, a sensitive sink, lifecycle execution, evasion, an unexpected destination, or authoritative malicious intelligence.",
          "This distinction is why REVIEW exists separately from BLOCK. Review asks whether behavior matches publisher intent. Block says the exact artifact crossed a policy boundary.",
        ],
      },
      {
        heading: "What reviewers should demand",
        paragraphs: [
          "The finding must identify the exact artifact, version, file, rule, evidence class, and expected verification step. Reputation can add context, but it cannot erase executable evidence or prove that future releases are safe.",
        ],
      },
    ],
  },
  {
    slug: "artifact-is-the-boundary",
    category: "Supply chain",
    title: "The extension artifact is the boundary",
    summary:
      "A repository, publisher name, and download count cannot substitute for the exact bytes installed in the IDE.",
    published: "12 July 2026",
    reading: "1 min read",
    sections: [
      {
        heading: "Names are mutable; hashes are not",
        paragraphs: [
          "Users install a VSIX, not a GitHub repository. Build output, vendored dependencies, generated bundles, native binaries, and packed resources can differ materially from the source people review.",
          "Every GUARDRAILS decision therefore binds to publisher.extension, version, registry source, and artifact SHA-256.",
        ],
      },
      {
        heading: "Why versions matter",
        paragraphs: [
          "A trusted extension can publish a compromised update. A legitimate feature can introduce a new process or credential boundary. Version comparison makes new access visible without treating every update as malicious.",
        ],
      },
      {
        heading: "Reproducible evidence",
        paragraphs: [
          "File hashes, resolved entrypoints, dependency versions, analyzer rulesets, and coverage limitations make the decision reproducible. If the artifact or ruleset changes, the old conclusion is historical evidence rather than current approval.",
        ],
      },
    ],
  },
  {
    slug: "reading-a-decision",
    category: "Field guide",
    title: "Reading an IDE extension decision",
    summary:
      "A practical guide to ALLOW, REVIEW, BLOCK, and INCOMPLETE without mistaking scores for certainty.",
    published: "12 July 2026",
    reading: "2 min read",
    sections: [
      {
        heading: "Start with the operational decision",
        paragraphs: [
          "ALLOW means required analysis completed without crossing the active review or block policy. REVIEW means sensitive or correlated behavior needs human context. BLOCK means authoritative or policy-rejected evidence applies. INCOMPLETE means analysis coverage cannot support approval.",
        ],
      },
      {
        heading: "Then inspect the reason",
        paragraphs: [
          "The bottom line should state what the extension can do, why that access surfaced, and what must be verified before installation. Counts and severity labels are supporting evidence, not the explanation.",
        ],
      },
      {
        heading: "Scores order work",
        paragraphs: [
          "Risk and malware indexes prioritize evidence; they are not calibrated probabilities. Security dimensions show where deductions came from, while analysis confidence shows whether required entrypoints and providers completed.",
        ],
      },
      {
        heading: "Approval expires with the artifact",
        paragraphs: [
          "An approval belongs to one hash and ruleset. New versions should be compared for capabilities, dependencies, findings, entrypoints, files, and artifact identity before the decision is carried forward.",
        ],
      },
    ],
  },
];
export function getResearch(slug: string) {
  return researchArticles.find((article) => article.slug === slug);
}
