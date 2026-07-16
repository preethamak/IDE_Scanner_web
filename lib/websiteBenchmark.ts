/**
 * Frozen public facts for the website benchmark. These values are intentionally
 * checked into the web application rather than calculated in a serverless
 * request. The public page carries the normalized artifact rows and integrity
 * hashes directly so readers can inspect the evidence without a code-host link.
 */
export const websiteBenchmark = {
  publishedAt: "2026-07-16",
  scannerCommit: "e371f543528957ae9048e99132116b3ece5a2039",
  corpus: {
    artifacts: 30,
    bytes: 697_056_453,
    freshHoldouts: 21,
    priorExposureControls: 9,
  },
  untouched: {
    completed: "23/30",
    completedInterval: "59.1%–88.2%",
    routed: "20/23",
    routedInterval: "67.9%–95.5%",
    legitimateBlocks: "1/23",
    legitimateBlocksInterval: "0.8%–21.0%",
  },
  regression: {
    completed: "30/30",
    completedInterval: "88.6%–100%",
    routed: "30/30",
    routedInterval: "88.6%–100%",
    decisions: { allow: 4, review: 26, block: 0, incomplete: 0 },
    legitimateBlocks: "0/30",
    legitimateBlocksInterval: "0%–11.4%",
  },
  maliciousDevelopmentRegression: {
    artifact: "bingcha.bcai-tools@4.0.37",
    decision: "block",
    malwareScore: 82,
    riskScore: 87,
  },
  rawReportSha256: {
    firstPass: "e0040281192d0b9883b7ee95684816c0506d29ef08b11f3618017e47e76db73c",
    final: "391bb2fef6f85405d02a246e7f720daa117062937913e591bf7f9c8b6bb13979",
  },
} as const;
