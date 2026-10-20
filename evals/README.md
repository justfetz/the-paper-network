# Evals: how the AI parts are checked

Two parts of the project run on Claude, and they are held to account differently.

## The verification pass (`ingest/claude_verify.py`)

A classifier with a search engine. Its correctness is accuracy per field against labeled sites.

- **Golden set.** Sites whose truth is published by the companies themselves (the integrated producers' plant lists)
  or by the press (closures with dates). `evals/verify_golden.csv` is the labeled file: `registry_id, operating,
  plant_type, owner, source_url`. Run the pass over those ids and compare per field; the confidence column is
  calibrated against the hit rate ("high" should be right about 95% of the time).
- **Second-model audit.** `evals/verify_audit.py` re-checks a random sample of `data/plants_verified.csv` with a
  different model and reports agreement per field. Disagreements are the review queue; a rising rate is the drift alarm.
- **Fixed re-run set.** The same fifty sites every month; a change in model, prompt or web shows up here first.
- **Guardrails that are rules.** Strict output schema with "unknown" allowed; the pass can only remove a site from the
  demand layer (operating = no), never add one; budget cap per run; cost ledger per site; the downstream pipeline is
  deterministic code and the model never edits the model.

## The chat ("Ask the network")

Open questions over the solved model. Its correctness rests on the page functions it calls, so the evals test tool use.

- **Generated golden set.** `python evals/chat_golden.py data/paper_network.json evals/chat_golden.json` writes
  questions whose answers are computed from the data file: knockout costs, mill capacities and owners, market demand
  and delivered marginal cost, price-shock tons, scenario KPIs, plus questions whose right answer is "that is not public".
- **Runner.** `python evals/run_chat_eval.py evals/chat_golden.json data/paper_network.json [--model ...] [--limit N]`
  asks each question through the Messages API with the same six tools implemented in Python and scores: the expected
  number appears (within tolerance, in whatever unit the model wrote it: `1.05 million tons`, `1.05 Mt` and `1,050 kt`
  all count), a lookup happened before any number was stated, and non-public questions were declined. Needs
  `ANTHROPIC_API_KEY`; a full run of 45 questions is about $0.60 on Claude Opus 5.5. `--regrade evals/chat_eval_results.json`
  re-scores the saved answers with the current grader without calling the API, which is how grader bugs are separated
  from model bugs.
- **Page-side guardrail.** The drawer lists the lookups under every answer with the raw results, and flags any answer
  that quotes dollars, tons or percentages about the network without a lookup behind it.
