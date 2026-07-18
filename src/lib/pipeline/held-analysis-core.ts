export interface AnalysisWorkResult {
  claimed: number;
  analyzed: number;
  failed: number;
}

export interface AnalysisProgress {
  held: number;
  pending: number;
  processing: number;
  retryableFailed: number;
  completed: number;
}

export interface HeldAnalysisBatchResult extends AnalysisWorkResult {
  activated: number;
  jobsCreated: number;
  heldRemaining: number;
  pending: number;
  processing: number;
  retryableFailed: number;
  completed: number;
}

interface HeldAnalysisBatchDependencies {
  batchSize: number;
  activateHeldPosts: (batchSize: number) => Promise<number>;
  enqueueJobs: (batchSize: number) => Promise<number>;
  processAvailableJobs: (
    batchSize: number,
  ) => Promise<AnalysisWorkResult>;
  getProgress: () => Promise<AnalysisProgress>;
}

export async function runHeldAnalysisBatchCore({
  batchSize,
  activateHeldPosts,
  enqueueJobs,
  processAvailableJobs,
  getProgress,
}: HeldAnalysisBatchDependencies): Promise<HeldAnalysisBatchResult> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("batchSize must be between 1 and 100");
  }

  const activated = await activateHeldPosts(batchSize);
  const jobsCreated = await enqueueJobs(batchSize);
  const work = await processAvailableJobs(batchSize);
  const progress = await getProgress();

  return {
    activated,
    jobsCreated,
    ...work,
    heldRemaining: progress.held,
    pending: progress.pending,
    processing: progress.processing,
    retryableFailed: progress.retryableFailed,
    completed: progress.completed,
  };
}
