# UI contract
Dialog #draft-navigation has accessible name, buttons #draft-save (Save), #draft-discard (Discard), #draft-stay (Stay). Escape is Stay. #pack-select remains the active identity until permission succeeds. #export-profile and #export-current-profile share validation; #save-status distinguishes pending changes, saved local revision and download requested. Native unload has browser-owned text.

Further departures are ignored while the first decision/save is pending. Exact field reversion restores saved/unchanged status; export reports unsaved edits as well as download requested when applicable. Numeric-equivalent differently formatted strings may remain dirty.
