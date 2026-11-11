# Activision data access inquiry (parked draft)

Status: **send-ready packet, parked 2026-11-11**. Nothing has been sent or submitted. This folder contains contact directions and wording for a future inquiry about read-only MW4 DMZ data access. It does not grant API access or link an account to the guide.

## Packet contents

- [Short support-form message](support-form-short.md) for a limited text field.
- [Full request](request-draft.md) when the receiving team accepts a longer inquiry.
- This page: verified starting routes and the steps to resume later.

## Which route to use

| Goal | Official route | What to do | Limitation |
| --- | --- | --- | --- |
| Ask whether approved third-party API access exists for MW4 DMZ data | [Activision Support Options](https://support.activision.com/options) | Sign in, select Call of Duty: Modern Warfare 4 and Steam if offered, then look for a suitable inquiry route and use the [short message](support-form-short.md) or [full request](request-draft.md). | The public form is for player support; no dedicated API application form was found. Ask for routing rather than claiming Support can approve access. Do not select an unrelated issue just to force a ticket. |
| Request a copy of personal data Activision holds | [Privacy and Data Protection Portal](https://support.activision.com/privacy) | Choose **access** or **data portability**, sign in and verify the account, and review the available categories before submitting. | This is a personal-data request, not an API license or live sync. The export may omit current DMZ stash details. |
| Ask about a missing data category in a privacy request | [Privacy request guidance](https://support.activision.com/privacy/request) | Follow the portal's instructions for missing categories; it identifies `individualrights@activision.com` for this purpose. | This address is for individual-rights requests, not a developer-access application. |

Activision's [account guidance](https://support.activision.com/articles/managing-your-activision-profile) says gameplay-related data can be used by Activision tools and approved third-party partners/licensees. It does not describe a public self-service application, OAuth scope, or MW4 DMZ stash endpoint. Do not send passwords, 2FA codes, cookies, session tokens or account exports with an initial inquiry. Do not change gameplay-data privacy settings merely to apply; ask what access and consent are actually required.

## Resume later

1. Open [Support Options](https://support.activision.com/options), sign in and choose MW4/Steam if available. Check whether a suitable inquiry route is offered. Use the [short message](support-form-short.md) for a small field or [full request](request-draft.md) for a longer one.
2. Enter your name/reply address only in the official form if requested. Send it yourself when ready, or use a verified developer/partnerships route if Activision supplies one. Keep the ticket number and response in private notes, not public Git history.
3. If approved, obtain written terms, API documentation, authentication method, permitted fields, rate limits and retention rules before building a connector.
4. First test read-only with a test account and a response showing the specific MW4 DMZ fields. Stage an import preview before any local inventory change.

The current local alternative is [Field operations](../field-operations.md): reviewed screenshot imports and manual after-run updates. Its account assessment records the limited signed-in browser check.
