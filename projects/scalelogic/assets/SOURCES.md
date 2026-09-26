# ScaleLogic project-page assets

The page content is aligned with the author-provided manuscript `searchRL___ICLR_27.pdf`, read on 26 September 2026. The paper title is “How Deep Can LLMs Learn to Reason? Expressiveness Is Key”. Numerical claims were checked against the main text and Appendices H.6 and J.

Result PNGs are copied without modification from `C:/Users/wtl/Documents/GitHub/searchRL/res/`. `manifest.json` records source paths, dimensions, and SHA-256 checksums. No experimental curves were redrawn or synthesized.

- `overview.png`: existing Figure 1, originally obtained from https://arxiv.org/html/2605.06638v1/figures/searchRL_newnew.png.
- `fig_scaling_loglog.png`, `fig_gamma_bar.png`: Figure 2 (γ = 1.05–2.60).
- `fig_downstream_a.png`, `fig_downstream_b_matched.png`: Figure 3. Use the matched-depth / matched-training-steps variant, not the older `fig_downstream_b` export.
- `fig_distribution.png`, `fig_algorithm.png`: Figure 4.
- `fig_ood_absolute.png`, `fig_ratio_collapse.png`: Figure 5.
- `fig_strong_llm.png`: Figure 16 / Appendix J, six evaluated frontier models on + Quantification (four choices, 30 held-out tasks per depth). The PNG was checked visually against page 38 of the submitted PDF. The two cross-model replication figures are retained as unused assets.
- The alternative-training table reproduces selected rows from Table 12. Its downstream metric is the eight-benchmark mean Avg@8; budgets are matched by training sequence count.

Older SVG exports remain in this directory but are no longer referenced by the page. Paper and citation links use the stable arXiv identifier 2605.06638.

The interactive proof explorer uses 150 real single-goal graphs exported from the research repository: five cumulative logic settings, generator depths 3/5/7, and ten examples per combination. `proof-examples.js` contains the graph and replay data; `proof-examples-provenance.json` records generator/solver source hashes. Reproduce with `python scripts/export-proof-examples.py --source ../searchRL`. The exporter uses the actual `generator_v2.py` and `sft_solver.py`, independently truth-table checks each inference, and renders five-letter predicates in the dataset style. It selects binary, non-reused proof graphs with refuted-sibling disjunctions for readability; these are single complete derivations, not full four-choice benchmark instances or model outputs. Playback splits disjunction introduction and elimination, so its step count is distinct from generator depth. New example samples the bank without repetition until a combination is exhausted. The layout is implemented from scratch, with the reading sequence of https://neulab.github.io/think-before-you-link/ as a design reference.
