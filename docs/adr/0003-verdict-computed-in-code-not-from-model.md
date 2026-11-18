# Compute the merge verdict in code from severities, not from the model

The Verdict is a **deterministic function of the findings' severities**, computed in our code, not a field we ask the model to produce: any `blocker` → request-changes; else any `warning` → comment; else approve.

We chose this so the verdict is reproducible and unit-testable, and so it can never contradict the inline findings the model actually returned. Asking the LLM for an overall "ready to merge?" judgement would reintroduce nondeterminism and the risk of a verdict that disagrees with its own comments. The model's only job is to produce findings with a category and severity; the aggregation rule is ours.
