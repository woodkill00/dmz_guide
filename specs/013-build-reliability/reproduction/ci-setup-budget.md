# Bounded CI dependency setup evidence

2026-10-22. These are actual hosted observations obtained before the proposed workflow edit, not a simulated network failure or a claim of a production defect.

- Main 011 [job 119813754258](https://github.com/woodkill00/dmz_guide/actions/runs/39775643024/job/119813754258): official Playwright dependency installation took about 21m23s. Firefox/WebKit readers passed, but Studio was cancelled when the 25-minute overall job cap expired. The unchanged retry [job 119825707022](https://github.com/woodkill00/dmz_guide/actions/runs/39775643024/job/119825707022) installed in about 37s, then completed readers in about 84s and Studio in about 181s.
- Maintenance [job 119885414548](https://github.com/woodkill00/dmz_guide/actions/runs/39796652108/job/119885414548): dependency installation ran 14:33:34–14:56:38 UTC, 23m04s. Contributor engine journeys passed; readers were cancelled at the overall job cap and Studio did not run. There was no assertion failure in the retrieved log. Only that job was retried after the run was terminal. Retry [job 119909900831](https://github.com/woodkill00/dmz_guide/actions/runs/39796652108/job/119909900831) installed in 44s and completed contributor/readers/Studio in 20/152/221s, totaling 6m33s, at 15:24:33 UTC. All six attempt-2 jobs succeeded; the other five successes were preserved.
- Fully integrated 018 [job 119887510511](https://github.com/woodkill00/dmz_guide/actions/runs/39797230432/job/119887510511): installation took 58s; measured-scale, contributor, reader and Studio commands took 50/13/128/188s, totaling 6m19s. All required checks passed. This supplies the larger integrated-suite observation rather than extrapolating only from the smaller 011 suite.

## Contract and limits

The approved proposal changes only the engine job cap from 25 to 40 minutes and adds a 25-minute cap to its existing install step. The step consumes the same overall budget; earlier checkout/npm/build steps also consume time. Both limits remain finite. This is not a guarantee against infrastructure failure, a diagnosis of a particular mirror/network cause, a retry policy, or a relaxation of product/test deadlines or assertions. No command, platform, security setting, dependency, action pin or artifact policy changes.

Independent requirements review and exact two-setting source review precede publication. Local static checks cannot prove hosted execution. The final candidate and merged main still require their ordinary full checks; do not mark those future outcomes complete in advance.

## Additional exact-main setup failure observed during convergence

Exact main `681242d0e93a9809025aa91d6c110033a00dc748`, run `39811432187`, engine job `119938420767`, reached the existing official dependency-install command at 2026-10-22 16:08:54 UTC. Ubuntu package-index retrieval last reported progress at 16:09:14; the actual job log records cancellation at 16:34:01, before any browser-test step ran. The other five required jobs passed. This is further evidence for a separately bounded setup phase, not evidence that a larger overall budget can make a stalled download succeed. The proposed install-step limit remains 25 minutes and failures remain fatal. Any retry and exact-main completion are recorded separately in the owning 016 acceptance/PR receipt; this failed attempt is not a successful browser gate.
