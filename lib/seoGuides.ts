export type SeoGuide = { slug: string; title: string; description: string; action: string; actionLabel: string; sections: [string, string[]][]; sources: [string, string][] };

export const seoGuides: SeoGuide[] = [
  {
    "slug": "check-vscode-extension-safety",
    "title": "How to check if a VS Code extension is safe",
    "description": "Check publisher identity, exact versions, package evidence, and update changes before installing a VS Code extension. Use this practical review checklist.",
    "action": "/registry",
    "actionLabel": "Check an extension in the registry",
    "sections": [
      [
        "Start with the exact extension and release",
        [
          "Record the publisher.extension identifier, version, source marketplace, and download location. Display names and icons are easy to imitate. Follow the publisher link from the original project website and compare identifiers before installing.",
          "A review of version 1.2.0 does not approve 1.3.0. Keep the version and, when available, the package SHA-256 with the review so another person can reproduce the decision."
        ]
      ],
      [
        "Use reputation as a starting point",
        [
          "Check the publisher, linked repository, recent maintenance, release notes, and issue discussions. A verified publisher or a large installation count is useful context, but it does not establish what a particular package contains.",
          "Keep Marketplace signature verification enabled. A valid signature helps establish package integrity and origin; it does not mean every behavior in the package fits your environment."
        ]
      ],
      [
        "Inspect package behavior against its purpose",
        [
          "Look for capabilities that need explanation: launching child processes, downloading executable content, accessing credentials, or communicating with unexpected endpoints. A debugger may legitimately launch processes; a theme making the same request deserves a closer look.",
          "Check whether the published package matches the expected source and includes bundled dependencies or native components. Source review alone can miss code introduced during packaging. Missing or incomplete scan coverage must remain an unanswered question."
        ]
      ],
      [
        "Read evidence rather than only a score",
        [
          "In GuardRails, look up the exact release in the Extension Registry and inspect artifact identity, analysis coverage, capabilities, and the evidence behind the result. If the release has not been analyzed, do not substitute another version as approval.",
          "An instructive case is the Red Hat Fabric8 Analytics false positive documented in our research library: a dependency advisory matched an npm security placeholder. Verification changed the conclusion. A severe label needs package and version context before it becomes an accusation."
        ]
      ],
      [
        "Make a decision and review updates",
        [
          "Record the reason for installing the extension, the reviewed version, unresolved questions, reviewer, and review date. Choose allow, investigate, or avoid according to the evidence and the sensitivity of the machine.",
          "Revisit the decision when a release changes capabilities, dependencies, publisher ownership, or network behavior. Removing extensions you no longer use reduces the amount of third-party code you need to assess."
        ]
      ],
      [
        "What this checklist cannot prove",
        [
          "No checklist or scan proves an extension universally safe. Static analysis may miss behavior that appears only at runtime, after a remote response, or on a different platform. Workspace Trust helps with unfamiliar workspace content, but it is not a universal sandbox for extension code."
        ]
      ]
    ],
    "sources": [
      [
        "VS Code extension runtime security",
        "https://code.visualstudio.com/docs/configure/extensions/extension-runtime-security"
      ],
      [
        "VS Code Workspace Trust",
        "https://code.visualstudio.com/docs/editing/workspaces/workspace-trust"
      ]
    ]
  },
  {
    "slug": "scan-vsix-file",
    "title": "How to scan a VSIX file before installation",
    "description": "Review a downloaded VSIX file before installing it: preserve its hash, inspect package contents, assess scanner evidence, and record the exact release.",
    "action": "/vsix-audit",
    "actionLabel": "Compare local VSIX inspection options",
    "sections": [
      [
        "Preserve the file before inspecting it",
        [
          "A VSIX is an extension package. Download it from the expected publisher or marketplace and record its source, version, and retrieval date. Do not install an unfamiliar extension just to discover what it does.",
          "Calculate a SHA-256 with Get-FileHash on PowerShell, shasum -a 256 on macOS, or sha256sum on Linux. The hash identifies the bytes you reviewed; it does not establish whether they are trustworthy. Keep a copy of the original package."
        ]
      ],
      [
        "Inspect the archive without running its code",
        [
          "Use an updated archive viewer in a disposable review environment to examine the package listing. Avoid running included scripts or binaries. Treat archive paths and extracted files as untrusted input.",
          "Inspect extension/package.json for the publisher, name, version, main or browser entry point, and activation behavior. Compare the identity with the listing you intended to download. Note bundled dependencies, native binaries, and downloaded components that need further review."
        ]
      ],
      [
        "Choose the scanner for the artifact you have",
        [
          "For independent local inspection of a downloaded VSIX, evaluate vsix-audit and its documented installation and usage. Follow the tool maintainer\u2019s current instructions rather than guessing command flags.",
          "For a published extension, GuardRails provides exact-release evidence in the registry. Confirm that the analyzed artifact and source match your file. The GuardRails CLI is a separate path for inspecting installed extensions locally; its coverage should not be assumed identical to a downloaded-file scanner."
        ]
      ],
      [
        "Interpret findings in context",
        [
          "Investigate credential access, process execution, remote code downloads, obfuscation, and unexpected endpoints in the context of the extension\u2019s purpose. A capability is a reason to inspect evidence, not automatic proof of malicious intent.",
          "Read scanner failures and skipped analysis alongside findings. A scan that could not unpack or inspect a component is incomplete. A clean static result does not establish what a remote payload or an unobserved execution path will do."
        ]
      ],
      [
        "Keep a reproducible review record",
        [
          "Save the package identity and SHA-256, scanner name and version, analysis date, findings, coverage gaps, and decision. For a published package, include the exact-release report link.",
          "If deeper analysis is needed, use a disposable environment without production credentials and a defined containment plan. Do not use your normal development workstation as a malware test environment."
        ]
      ]
    ],
    "sources": [
      [
        "VS Code Marketplace and signature verification",
        "https://code.visualstudio.com/docs/configure/extensions/extension-marketplace"
      ],
      [
        "Trail of Bits vsix-audit",
        "https://github.com/trailofbits/vsix-audit"
      ]
    ]
  },
  {
    "slug": "vscode-extension-allowlist",
    "title": "VS Code extension allowlist: a team review workflow",
    "description": "Build a VS Code extension allowlist with an inventory, exact-release reviews, approval records, update checks, and centrally managed extension policies.",
    "action": "/solutions/security-teams",
    "actionLabel": "Explore extension review for security teams",
    "sections": [
      [
        "Inventory before you enforce",
        [
          "Collect publisher.extension identifiers and installed versions across the editors and environments you manage. Include remote development hosts where extensions may execute separately from a developer\u2019s local editor.",
          "Assign an owner and business purpose to each extension. Remove unused entries and distinguish required tooling from optional tools. An allowlist copied from one workstation is unlikely to represent the needs of the whole team."
        ]
      ],
      [
        "Define what approval requires",
        [
          "Review the exact package release and its capabilities against the environment\u2019s data sensitivity. Preserve the evidence, reviewer, decision, review date, and any expiry or conditions.",
          "Use a simple decision record: extension identifier; source; version; artifact hash or report link; business purpose; observed capabilities; coverage gaps; owner; reviewer; decision; next review trigger. This is a reusable starting template, not a certification standard."
        ]
      ],
      [
        "Separate evidence from enforcement",
        [
          "GuardRails can support package review, inventory, monitoring, and recorded decisions. Configure enforcement through the editor and device management controls that apply to your fleet; a report or saved approval alone does not enforce an editor installation policy.",
          "VS Code documents extensions.allowed for allow rules and the centrally managed AllowedExtensions policy for organizations. Check the current Microsoft documentation and test the supported selectors on your managed VS Code version before rollout. Recommendations in .vscode/extensions.json are not an enforcement boundary."
        ]
      ],
      [
        "Pilot a narrow policy and an exception path",
        [
          "Begin with a small group and confirm that required extensions, remote workflows, and approved versions still work. Test both permitted and denied installations rather than relying only on the policy file looking correct.",
          "Define who can request an exception, who reviews it, what evidence is required, and when it expires. Explain the review outcome to the requester so the same unresolved case does not become a permanent informal bypass."
        ]
      ],
      [
        "Review changes without freezing maintenance",
        [
          "Choose review triggers for new releases, publisher changes, new capabilities, and important findings. A version pin may support a temporary review window, but indefinite freezing can leave security fixes unapplied.",
          "Track time to review, outstanding exceptions, unsupported versions, and the percentage of inventory with current evidence. Reconcile actual installed versions with approved records and investigate differences."
        ]
      ]
    ],
    "sources": [
      [
        "Microsoft: manage extensions in enterprise environments",
        "https://code.visualstudio.com/docs/enterprise/extensions"
      ],
      [
        "Microsoft: centrally manage VS Code settings",
        "https://code.visualstudio.com/docs/enterprise/policies"
      ]
    ]
  }
];
