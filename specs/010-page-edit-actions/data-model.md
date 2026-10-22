# Data model

Author target has exactly packKey (canonical safe catalog key), packId (immutable runtime catalog ID), id (immutable record ID), intent (edit or images). The resolver checks one exact catalog key and identity and one record in supported groups. Unknown, duplicate or extra query keys and invalid IDs/intents fail. Group/index are derived for UI selection only and never link identity. Empty query is the existing generic Studio landing; partially specified query is invalid.

Public record action target is generated from canonical catalog membership. Saved-preview return is always /preview?packKey=<validated key>&id=<validated ID>. No return URL is accepted. Supporting sources/claims/assets permit edit intent from their local preview, but images intent is restricted to six public groups.

Locations gain optional assetId plus assetIds with max eight unique IDs, same reference validation and published/portable bounds as other public entities. Existing source records and runtime format remain valid. Replacing primary changes assetId only; old asset metadata/bytes and other record references remain intact.

State: public detail → static guidance → explicit local document navigation → validate target → loaded selection → optional unsaved edits/media → validation preview → explicit repository save → saved same-record preview. Invalid target ends in an error without selected fallback. Canceling leave retains current draft/media; approving leave does not save.
