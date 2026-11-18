# The eval runs against the live model and does not gate CI

The Eval set runs against the **live Haiku API** to get a real quality signal (recall, precision, false-alarm count), but it runs as a **separate, manually-dispatched / nightly job that does not gate merges**. Per-commit CI instead replays **recorded model responses** captured as fixtures, so CI is deterministic and free, and gates lint → typecheck → test → build.

We split them because LLM output is nondeterministic and costs money: letting it block every merge would make CI flaky and incur per-commit API cost, while mocking the model inside the gating tests keeps correctness checks fast and reproducible. The eval's job is to track quality over time, not to pass/fail individual commits.
