# Plan

Render a status line in the existing upgrade overview using the same schema and content-version predicates as the checkbox. Deep link to Settings with the current pack ID. Keep the existing guarded migration and confirmation code. Verify the rendered guidance and existing click/save browser journey. Rollback is removal of the status line and its assertions.

## Review

The user's symptom can also mean a modal is obscured in their browser; the fresh-profile browser flow opens it. This repair targets the reproducible disabled-profile state and makes the confirmation step clear. Test both states after build.
