# Parse the diff ourselves and hard-validate that findings land on changed lines

We parse the unified diff ourselves, present each hunk to the model with explicit new-file line numbers, and then **validate every returned finding against the set of changed lines**. Any finding whose line is not a changed line is discarded (and counted as a model error in the eval) — it is never posted.

This exists because GitHub only accepts inline comments on lines that are part of the diff, and because we do not trust the model to respect that boundary on its own. Owning the parse-and-validate step is what mechanically enforces the "comment only on changed lines" guarantee, rather than hoping the prompt holds.
