import { RFP_MATRIX, totalRequirements } from './rfp-matrix';
import { BucketCoverage, CoverageReport, ParsedManifest } from './types';

export function buildCoverageReport(manifest: ParsedManifest): CoverageReport {
  const coveredSet = new Set(manifest.coveredIds);
  const declaredUncovered = new Set(manifest.declaredUncoveredBuckets);

  const buckets: BucketCoverage[] = RFP_MATRIX.map((bucket) => {
    const covered = bucket.requirements.filter((r) => coveredSet.has(r.id));
    const uncovered = bucket.requirements.filter((r) => !coveredSet.has(r.id));
    const percent =
      bucket.requirements.length === 0
        ? 0
        : Math.round((covered.length / bucket.requirements.length) * 100);
    return {
      bucket,
      covered,
      uncovered,
      percent,
      declaredUncovered: declaredUncovered.has(bucket.code),
    };
  });

  const totalCovered = buckets.reduce((s, b) => s + b.covered.length, 0);
  const total = totalRequirements();
  return {
    buckets,
    totalRequirements: total,
    totalCovered,
    overallPercent: total === 0 ? 0 : Math.round((totalCovered / total) * 100),
  };
}
