# Final 017 observed medians

Milliseconds, one warmup and five samples per unchanged valid fictional fixture. No timing assertions or causal cross-run speedup claims.

| Platform         | Fixture         | Count | Initialization | Interaction to next paint | Mounted rows |
| ---------------- | --------------- | ----: | -------------: | ------------------------: | -----------: |
| linux-chromium   | inventory       |   100 |           97.4 |                      18.7 |           50 |
| linux-chromium   | inventory       |  1000 |          130.4 |                      19.3 |           50 |
| linux-chromium   | inventory       |  5000 |          234.4 |                      18.3 |           50 |
| linux-chromium   | native-selector |   100 |           95.0 |                      30.8 |          n/a |
| linux-chromium   | native-selector |  1000 |          130.5 |                      29.3 |          n/a |
| linux-chromium   | native-selector |  5000 |          309.9 |                      33.0 |          n/a |
| windows-chromium | inventory       |   100 |          113.9 |                      19.0 |           50 |
| windows-chromium | inventory       |  1000 |          130.1 |                      19.0 |           50 |
| windows-chromium | inventory       |  5000 |          220.6 |                      18.1 |           50 |
| windows-chromium | native-selector |   100 |          110.0 |                      29.8 |          n/a |
| windows-chromium | native-selector |  1000 |          133.8 |                      26.6 |          n/a |
| windows-chromium | native-selector |  5000 |          303.4 |                      33.9 |          n/a |
| linux-firefox    | inventory       |   100 |           99.0 |                      13.0 |           50 |
| linux-firefox    | inventory       |  1000 |          115.0 |                      13.0 |           50 |
| linux-firefox    | inventory       |  5000 |          182.0 |                      11.0 |           50 |
| linux-firefox    | native-selector |   100 |           96.0 |                      26.0 |          n/a |
| linux-firefox    | native-selector |  1000 |          113.0 |                      21.0 |          n/a |
| linux-firefox    | native-selector |  5000 |          176.0 |                      27.0 |          n/a |
| linux-webkit     | inventory       |   100 |           69.0 |                      17.0 |           50 |
| linux-webkit     | inventory       |  1000 |           94.0 |                      18.0 |           50 |
| linux-webkit     | inventory       |  5000 |          149.0 |                      28.0 |           50 |
| linux-webkit     | native-selector |   100 |           77.0 |                      18.0 |          n/a |
| linux-webkit     | native-selector |  1000 |           95.0 |                      29.0 |          n/a |
| linux-webkit     | native-selector |  5000 |          182.0 |                      23.0 |          n/a |
