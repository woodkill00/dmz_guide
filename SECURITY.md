# Security

## Supported state

This repository is a planning/tooling bootstrap. There is no supported production application release. Treat future content imports, picture bundles, storage migrations and remote links as security-sensitive boundaries.

## Report privately

Do not post vulnerabilities, exploit details, credentials or private data in public issues or pull requests.

Use GitHub's **Report a vulnerability** action on this repository's Security tab **only if it is available**. Private vulnerability reporting has not been verified as enabled; this document does not promise a private intake channel. No security email address has been established.

If the private action is unavailable, ask the repository owner to establish a private reporting route without including the vulnerability or affected private data. Wait for a verified private destination before transmitting details. Do not put exploit details in a public contact request.

A private report should contain the affected commit/version, minimal sanitized reproduction, impact and any safe mitigation. Never send live secrets or other people's data. Test only systems and data you are authorized to assess.

## Maintainer handling

Confirm a private channel first. Reproduce in an isolated environment, restrict access to the report, assess impact, prepare a regression test and scoped fix, and review before publication. Coordinate disclosure with the reporter; do not promise a response deadline without assigned coverage. If secrets were exposed, the account owner must revoke/rotate them through the relevant service; deleting a file alone does not remove history or revoke credentials.

Follow the [emergency-change procedure](docs/tutorials/change-types.md#emergency-change) without publishing confidential incident artifacts into the repository.
