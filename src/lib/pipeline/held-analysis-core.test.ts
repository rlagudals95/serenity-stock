import { describe, expect, it, vi } from "vitest";

import { runHeldAnalysisBatchCore } from "./held-analysis-core";

describe("runHeldAnalysisBatchCore", () => {
  it("activates held posts, enqueues them, and returns analysis progress", async () => {
    const activateHeldPosts = vi.fn().mockResolvedValue(25);
    const enqueueJobs = vi.fn().mockResolvedValue(25);
    const processAvailableJobs = vi.fn().mockResolvedValue({
      claimed: 25,
      analyzed: 24,
      failed: 1,
    });
    const getProgress = vi.fn().mockResolvedValue({
      held: 567,
      pending: 0,
      processing: 0,
      retryableFailed: 1,
      completed: 124,
    });

    const result = await runHeldAnalysisBatchCore({
      batchSize: 25,
      activateHeldPosts,
      enqueueJobs,
      processAvailableJobs,
      getProgress,
    });

    expect(activateHeldPosts).toHaveBeenCalledWith(25);
    expect(enqueueJobs).toHaveBeenCalledWith(25);
    expect(processAvailableJobs).toHaveBeenCalledWith(25);
    expect(getProgress).toHaveBeenCalledOnce();
    expect(result).toEqual({
      activated: 25,
      jobsCreated: 25,
      claimed: 25,
      analyzed: 24,
      failed: 1,
      heldRemaining: 567,
      pending: 0,
      processing: 0,
      retryableFailed: 1,
      completed: 124,
    });
  });

  it("processes retryable jobs even when no held posts remain", async () => {
    const result = await runHeldAnalysisBatchCore({
      batchSize: 10,
      activateHeldPosts: vi.fn().mockResolvedValue(0),
      enqueueJobs: vi.fn().mockResolvedValue(0),
      processAvailableJobs: vi.fn().mockResolvedValue({
        claimed: 2,
        analyzed: 2,
        failed: 0,
      }),
      getProgress: vi.fn().mockResolvedValue({
        held: 0,
        pending: 0,
        processing: 0,
        retryableFailed: 0,
        completed: 692,
      }),
    });

    expect(result.claimed).toBe(2);
    expect(result.analyzed).toBe(2);
    expect(result.heldRemaining).toBe(0);
  });

  it("rejects invalid batch sizes before changing data", async () => {
    const activateHeldPosts = vi.fn();

    await expect(
      runHeldAnalysisBatchCore({
        batchSize: 0,
        activateHeldPosts,
        enqueueJobs: vi.fn(),
        processAvailableJobs: vi.fn(),
        getProgress: vi.fn(),
      }),
    ).rejects.toThrow("batchSize must be between 1 and 100");

    expect(activateHeldPosts).not.toHaveBeenCalled();
  });
});
