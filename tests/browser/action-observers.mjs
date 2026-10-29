/** Attach rejection handlers to every observer before starting its UI action.
 * Promise.all remains fail-fast: no retry, ignored rejection or deadline change.
 */
export function observeBrowserAction(action, observers) {
  return Promise.all([...observers, Promise.resolve().then(action)]);
}
