# Tasks
## Phase1 Definition
- [x] T001 Spec/clarify/constitution/plan/model/research/quickstart/checklist/analyze with independent requirement review. FR001–011/SC003.
## Phase2 Search (US1)
- [x] T002 Pure search.ts/grid-origin/rank/filter/quoted/notes/fuzzy/nearby/grouping tests and engine; performance at30k bounded records. FR001–004/SC001.
- [x] T003 Search panel with advanced filters/query help/map-center/gridXY origins, results grid/distance/details/Jump/Nearby/reset/pagination/debounce, app host callbacks; browser regressions. FR001–004/SC001.
## Phase3 Reliability (US2)
- [x] T004 Derived health dashboard storage/headroom/capturestatus/dependencies + safe prune/stage/backup links and recovery manifest; help/tool links. FR005/006.
- [x] T005 Fresh-profile restore drill with owned state/source/background dependencies, missing-file reports and no restricted export; source changed/removed/renamed/repeat/restart/multitab evidence gaps tests. FR006/010/SC002.
## Phase4 Owned evidence and annotations (US3)
- [x] T006 Optional date/sanitized attachment/route-area contracts, strict oldbackup-compatible validation, aggregate budgets/digests, meaningful unit and restore fixtures. FR007/008/SC002.
- [x] T007 Point form screenshot/date/vertices/map-pick tools and geometry rendering/edit/delete/undo, private backup roundtrip/cancel/quota/mobile tests. FR007/008/SC002.
## Phase5 Icon workflows (US4)
- [x] T008 Bounded recipe pack preview/import/export with atomic dedup/cancel; saveddesign starters and50-state designer undo/redo; browser/unit tests. FR009/SC002.
## Phase6 Verification (US5)
- [x] T009 Browser engine smoke, pinned accessibility scan, keyboard/manual checklist and CI configuration; run available engines and record actual unavailable checks. FR010/SC003.
- [x] T010 Update Help/docs fiveproviders/newworkflows; gameplay/physicaldevice validation worksheet explicitly pending real evidence. FR011/SC003.
- [x] T011 Full units/build/browser/capacity/repository/native regression as applicable; independent security/UI review, analyze/converge append repairs, exact acceptance evidence. SC001–003.
- [ ] T012 Owner gameplay/physicaltouch/screenreader evidence collection and review. External verification gate, cannot complete without actual observations. FR010/011/SC003.

Dependencies T001→T002→T003→T004→T005→T006→T007→T008→T009→T010→T011. T012 requires real evidence and stays open if unavailable. Implementation serialized; reviewers independently assess. No remote push/merge.

## Phase7 Convergence repairs
- [x] T013 Repair FG027-01 iconpack file text/JSON parsing boundary, preserve bounded read, run actual filepicker preview/import/repeat regression. FR009/SC002.

- [x] T014 Repair FG027-02 screenshot8MiB/4K normalization using separately bounded existing background decoder, without weakening native icon/content limits; preflightinput8192px/32MP, adaptiveoutput1600px/2MiB, >2MiB4K browser test and oversize rejection. FR007/SC002.
- [x] T015 Repair FG027-03 mixed-case query enum values and explicit unverified-source semantics; realsourceclaim fixtures and regressions. FR001/SC001.

- [x] T016 Keep grid/nearby-origin and geometry fallback popups inert for untrusted titles; title-select and arrow-key result navigation plus hostile title browser regression. FR003/004/SC001/003.

- [x] T017 Make existing400ms search-debounce cancellation race fixture deterministic: dispatch queue+undo/reload controls in one browser turn, retaining late-write assertions; document observed legitimate pre-action save under concurrent engine CPU load. SC003.

- [x] T018 Bound category suggestion DOM to200 while accepting any exact typed category; benchmark worst-case30knearest/grouped results and avoid redundant pack saves/empty exports. FR004/009/SC001/002.

- [x] T019 Expose bounded read-only local update history summaries in Health without source collection or file deletion; same-origin/token API, tests and documentation. FR005/SC002.
- [x] T020 Disable stale result actions while debounced searches are pending; manual origin choice replaces inline origin while preserving other normalized query terms. Reproduce fast-query wrong Jump with existing usability browser test and add focused assertion. FR002/003/SC001.

- [x] T021 Put result count/list in the initial search viewport: compact toolbar and collapsed optional nearby controls; preserve explicit origin/Go actions, mobile mode navigation and keyboard access. Recheck layout and browser regressions. FR003/004/SC001.

- [x] T022 Repair independent LAYOUT-R1: compact mobile workspace navigation/spacing and await settled search before mobile screenshots; assert result count and first title fully visible at360×800. FR003/004/SC001.
