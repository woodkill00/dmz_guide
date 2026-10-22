# Windows path/descriptor stat investigation

Observed at published a937035a79abd0f4b058a12970665fb2b55fda69, run39784692983, Windows119844650572: reader and Studio passed; packaging failed on dist/assets/content/site.json, output/open, before reading. dev13276750692006899310, ino281474976714124, size23 and mtime_ns1792674709404639800 matched. Path ctime_ns1792675151211346100 versus fd ctime_ns1792674709404639800 differed. No observed evidence identifies content mutation.

Exact interpreter version was not printed. The runtime-checks job does not select Python; repository-checks alone pins3.11. Validator inspected exact runner image windows-2025-vs2026 20261021.278.1, whose manifest advertises Python3.12.10, but that is not proof of the invoked executable. New native probe and package runtime output must establish the actual next-run interpreter.

Primary sources:
- [CPython issue157671](https://github.com/python/cpython/issues/157671): Windows path and fd ctime discrepancy reproduced by upstream, with source analysis and maintainer discussion. This is corroboration, not proof of our unknown prior interpreter.
- [CPython3.13.9 posixmodule.c](https://github.com/python/cpython/blob/v3.13.9/Modules/posixmodule.c#L2063-L2072): win32_xstat copies birthtime into ctime for compatibility.
- [CPython3.13.9 fileutils.c](https://github.com/python/cpython/blob/v3.13.9/Python/fileutils.c#L1032-L1041): handle conversion uses ChangeTime for ctime and CreationTime for birthtime.
- [Python3.12 os stat documentation](https://docs.python.org/3.12/library/os.html#os.stat_result.st_ctime_ns): Windows ctime deprecation and birthtime semantics.
- [Exact runner manifest](https://github.com/actions/runner-images/blob/win25-vs2026/20261021.278/images/windows/Windows2025-VS2026-Readme.md): advertised default only.

Reviewed amendment retains compatible cross-API identity/size/mtime checks plus full same-API ctime race checks on both path and fd. Reject every compatible identity difference, same-interface ctime-only change, short/growing reads, symlink/replacement and expected hash mismatch. Do not silently normalize observed timestamps. Native Windows execution remains required after source review.

CPython3.12.10 source independently checked too: [win32_xstat](https://github.com/python/cpython/blob/v3.12.10/Modules/posixmodule.c#L2008-L2018) copies birthtime into path ctime, while [handle conversion](https://github.com/python/cpython/blob/v3.12.10/Python/fileutils.c#L1036-L1041) uses ChangeTime. This matches the image-advertised version, without identifying the old invoked interpreter.

Red-first local test: recorded exact Windows tuples caused original bounded_read to raise at open before reading a stable23-byte fixture. Expanded race checks also failed because original implementation lacked post-open/post-read path observations. Native Linux3.12.14 probe was stable and rejected its deliberate in-read append. Actual Windows probe remains pending.

Local verification after repair (Linux, Python3.12.14): diagnostic suite10/10, complete Python suite39/39, build154 routes, package206 inventoried payloads and clean extraction/owned Node verification passed. Independent reviewer reran10/10 and approved exact source conditionally. Native Windows/runtime correlation, full hosted exact-head acceptance and main remain pending.

Repository checks:0 failures; npm test:306 passed,1 skipped,0 failed (307 total). A mistaken preliminary `npm run test:runtime` invocation failed because no such script exists; the documented `npm test` command above subsequently ran fully. No browser/Windows success is inferred from local checks.
