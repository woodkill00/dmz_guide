import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROFILE_BACKUP_SCOPE,
  PROFILE_BACKUP_EXCLUSIONS,
  verifiedBackupStatus,
} from "../../src/domain/backup-scope.mjs";

test("backup status only accepts a matching confirmed profile record", () => {
  const record = {
    packId: "fixture:pack",
    savedAt: "2026-11-11T12:00:00.000Z",
    revision: 4,
  };
  assert.deepEqual(verifiedBackupStatus(record, "fixture:pack"), {
    savedAt: record.savedAt,
    revision: 4,
  });
  assert.equal(verifiedBackupStatus(record, "fixture:other"), null);
  assert.equal(
    verifiedBackupStatus({ ...record, revision: -1 }, "fixture:pack"),
    null,
  );
  assert.ok(PROFILE_BACKUP_SCOPE.includes("Inventory and reserves"));
  assert.ok(
    PROFILE_BACKUP_EXCLUSIONS.includes("Map workspace and source captures"),
  );
});
