import type { BoardSize } from "./board";
import { canonicalRegions } from "./canonical";
import { generateCandidate, type Candidate } from "./generator";
import { solve } from "./solver";
export type GenerationOptions = Readonly<{
  size: BoardSize;
  maxAttempts: number;
  deadlineMs: number;
  now?: () => number;
  random?: () => number;
  cancelled?: () => boolean;
}>;
export type GenerationReport = Readonly<{
  attempted: number;
  accepted: readonly Candidate[];
  rejectedMultiple: number;
  rejectedNoSolution: number;
  rejectedDuplicate: number;
  stopped: "attempt-limit" | "timeout" | "cancelled";
}>;
export function generateValidated(
  options: GenerationOptions,
): GenerationReport {
  if (
    !Number.isInteger(options.maxAttempts) ||
    options.maxAttempts < 1 ||
    !Number.isFinite(options.deadlineMs)
  )
    throw new Error("invalid generation budget");
  const now = options.now ?? Date.now;
  const seen = new Set<string>();
  const accepted: Candidate[] = [];
  let attempted = 0,
    rejectedMultiple = 0,
    rejectedNoSolution = 0,
    rejectedDuplicate = 0;
  let stopped: GenerationReport["stopped"] = "attempt-limit";
  while (attempted < options.maxAttempts) {
    if (options.cancelled?.()) {
      stopped = "cancelled";
      break;
    }
    if (now() >= options.deadlineMs) {
      stopped = "timeout";
      break;
    }
    const candidate = generateCandidate(options.size, options.random);
    attempted++;
    const key = canonicalRegions(candidate.board.regions);
    if (seen.has(key)) {
      rejectedDuplicate++;
      continue;
    }
    seen.add(key);
    const result = solve(candidate.board);
    if (result.count === 0) rejectedNoSolution++;
    else if (result.count === 2) rejectedMultiple++;
    else accepted.push(candidate);
  }
  return {
    attempted,
    accepted,
    rejectedMultiple,
    rejectedNoSolution,
    rejectedDuplicate,
    stopped,
  };
}
