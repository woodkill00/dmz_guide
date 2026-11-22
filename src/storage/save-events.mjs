import {
  validateSaveReceipt,
  receiptAdmission,
} from "../domain/save-receipt.mjs";
export const SAVE_RECEIPT_KEY = "dmz-save-receipt-v1";
const channelName = "dmz-workspace-v1";
/** Best-effort metadata only. It must never change a transaction's result. */
export function publishSaveReceipt(owner, key, revision) {
  try {
    if (typeof window === "undefined") return;
    const receipt = validateSaveReceipt({
      version: 1,
      owner,
      key,
      revision,
      savedAt: new Date().toISOString(),
    });
    window.dispatchEvent(
      new CustomEvent("workspace-saved", { detail: receipt }),
    );
    try {
      localStorage.setItem(SAVE_RECEIPT_KEY, JSON.stringify(receipt));
    } catch {}
    try {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage(receipt);
      channel.close();
    } catch {}
  } catch {
    /* An advisory failure cannot reject or replay a committed save. */
  }
}
export function subscribeSaveReceipts(callback) {
  const admit = receiptAdmission();
  const receive = (value, remote) => {
    const receipt = admit(value);
    if (receipt) {
      try {
        callback(receipt, remote);
      } catch {}
    }
  };
  const own = (event) => receive(event.detail, false);
  const storage = (event) => {
    if (
      event.key !== SAVE_RECEIPT_KEY ||
      typeof event.newValue !== "string" ||
      event.newValue.length > 1024
    )
      return;
    try {
      receive(JSON.parse(event.newValue), true);
    } catch {}
  };
  window.addEventListener("workspace-saved", own);
  window.addEventListener("storage", storage);
  let channel;
  try {
    channel = new BroadcastChannel(channelName);
    channel.onmessage = (event) => receive(event.data, true);
  } catch {}
  return () => {
    window.removeEventListener("workspace-saved", own);
    window.removeEventListener("storage", storage);
    channel?.close();
  };
}
