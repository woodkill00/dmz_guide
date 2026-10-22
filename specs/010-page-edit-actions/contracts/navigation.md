# Navigation contract

- Public detail: two visible actions, Edit this item (items/weapons) or Edit this record, and Add/change image, near heading and outside spoiler disclosure.
- Public guidance: build-generated /contribute/<catalog-key>/<encoded-stable-id>/, separate edit/images section anchors, public-detail return link, local-only source checkout instructions, explicit http://127.0.0.1:4174/?packKey=…&packId=…&id=…&intent=edit|images links. No automatic network request. Display exact relative suffix for custom printed port. No target=_blank requirement.
- Author root GET/HEAD accepts empty search for existing landing, or exactly four keys above; duplicate/extra/invalid/unknown/mismatched target rejects with actionable error and no Studio document. Valid target renders Studio, which independently resolves the same current snapshot before selecting anything.
- Cross-site exception: GET / with a valid nonempty target, Sec-Fetch-Mode navigate and Sec-Fetch-Dest document, and no conflicting Origin. Ordinary same-origin/none behavior stays unchanged; every API, resource, iframe and write retains original checks.
- Local preview actions are same-origin generated paths. Studio shows selected stable identity plus Return to saved record; that return URL is derived, never supplied by caller. Generic existing saved-preview link remains available.
- Image intent scrolls/focuses #picture-file after selection; no automatic file chooser. Edit intent focuses #editor-record. No writes from navigation.
- Client navigation/discard considers dirty fields, pending media and busy operations. Browser beforeunload remains native; explicit in-app discard confirmation cancel preserves work.
