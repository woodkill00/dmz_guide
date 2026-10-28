# Research
The tracking-free public map page returned200 through a normal unauthenticated bounded GET. The web connector could not render it; no protection/auth bypass used. Inert page metadata declares map1084, tile_set1345/v5,26categories and sprite rectangles. Public client code identifies a fixed map-data endpoint. Terms resolve to https://www.ziffdavis.com/terms-of-use, which explicitly lists MapGenie; owner collection permission is pending confirmation for this new provider.

Latitude/longitude differ from other sources' percentages. Exact projection and independent imagery registration must precede placement. POI/tile/sprite acquisition is pending, not claimed complete. Raw page/client research stays ignored; downloaded scripts are never executed.

Authorized-code review repairs: reject singular/near-degenerate affine matrices, verify decoded sprite extent, enforce PNG chunk bounds and trusted category binding, dispose decoder realms using Node-owned deadlines (page timers are disabled), and admit whole sources within20k without dropping raw captures. Actual schema/art/calibration remains pending.
