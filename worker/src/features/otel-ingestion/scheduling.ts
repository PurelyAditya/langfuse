import type { EvalRules, fetchEvalRules } from "../evaluation/fetchEvalRules";
import type { EvalSchedulerDeps } from "../evaluation/scheduleEvals";
import type { resolveTraceDispatchSamplingRate } from "../traceDispatch/traceDispatchSampling";

export type OtelSchedulingHooks = {
  fetchRules?: typeof fetchEvalRules;
  samplingRate?: typeof resolveTraceDispatchSamplingRate;
  scheduler?: (params: {
    projectId: string;
    rules: EvalRules;
    traceDispatchSamplingRate: number;
    enabled: boolean;
    hasRows: boolean;
    defaultCreate: () => EvalSchedulerDeps;
  }) => EvalSchedulerDeps | null;
};
