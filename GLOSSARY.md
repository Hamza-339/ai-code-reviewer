# AI Code Reviewer

A GitHub App that reviews each pull request: it posts inline comments on changed lines and a single summary with a merge verdict. No chat UI. This glossary defines the project's own vocabulary; it is not a spec.

## Language

### The review

**Finding**:
A single reviewer observation about one changed line — the unit that becomes one inline comment. Every finding has a Category and a Severity.
_Avoid_: comment (ambiguous with GitHub comments), issue, note.

**Category**:
What kind of problem a finding is. Exactly one of: **bug**, **security**, **missing-test**.
_Avoid_: type, kind, label.

**Severity**:
How much a finding should block merging. One of: **blocker**, **warning**, **nit**. Severity, aggregated across all findings, determines the Verdict.
_Avoid_: priority, level.

**Verdict**:
The reviewer's merge recommendation for the whole PR, derived from the severities of its findings: **request-changes**, **comment**, or **approve**. The reviewer never asks the model for the verdict.
_Avoid_: decision, status, score, "ready to merge" (that's the informal name, not the term).

**Summary**:
The single, re-used top-level comment that states the Verdict and overview for a PR. Re-runs update the same Summary in place rather than adding a new one.
_Avoid_: report, overview comment, recap.

**Changed line**:
A line that is part of the PR's diff and is therefore eligible to carry a Finding. A finding that does not land on a changed line is discarded, never posted.
_Avoid_: diff line, touched line, hunk line.

**Fingerprint**:
A content-derived key (path + Category + a normalized hash of the offending code) used to recognize that a Finding on a re-run is the same one already posted, even if its line number has shifted. _Avoid_: hash, key, id.

### Evaluation

**Eval set**:
The curated collection of PR Fixtures used to measure reviewer quality. It lives in the repo.
_Avoid_: test set, benchmark, dataset.

**Fixture**:
One PR in the Eval set: a stored diff plus its labels (the seeded bugs it contains, if any).
_Avoid_: sample, case, example.

**Seeded bug**:
A deliberately planted defect in a Fixture, labeled with its location and Category, that the reviewer is expected to find.
_Avoid_: planted bug, known bug, ground-truth defect.

**Decoy PR**:
A Fixture with no seeded bugs, included to detect over-flagging. Any Finding it attracts is a False alarm.
_Avoid_: clean PR, negative case, control.

**Catch**:
A Finding that correctly identifies a Seeded bug (matching Category, at the right place). Catches drive recall.
_Avoid_: true positive, hit, match.

**False alarm**:
A Finding that corresponds to no Seeded bug. False alarms drive precision down.
_Avoid_: false positive, noise, misfire.
