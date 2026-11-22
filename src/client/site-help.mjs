import { siteTopics, workspacePreferences } from "../domain/site-workflows.mjs";
import { WORKSPACE_UI_KEY } from "./site-tools.mjs";
const form = document.querySelector("#help-search"),
  query = document.querySelector("#help-query");
const topics = [...document.querySelectorAll("[data-help-topic]")];
let prefs;
try {
  prefs = workspacePreferences(localStorage.getItem(WORKSPACE_UI_KEY));
} catch {
  prefs = workspacePreferences(null);
}
function filter() {
  const tokens = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let matching = 0;
  for (const topic of topics) {
    topic.hidden = !tokens.every((t) => topic.dataset.helpSearch.includes(t));
    if (!topic.hidden) matching++;
    topic.open = tokens.length
      ? !topic.hidden
      : prefs.topics.includes(topic.dataset.helpTopic) ||
        location.hash === "#" + topic.id;
  }
  document.querySelector("#help-count").textContent =
    `${matching} of ${topics.length} topics`;
}
form.hidden = false;
form.addEventListener("input", filter);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  filter();
});
form.addEventListener("reset", () => setTimeout(filter, 0));
window.addEventListener("hashchange", filter);
for (const topic of topics)
  topic.addEventListener("toggle", () => {
    if (query.value.trim()) return;
    const ids = topics
      .filter((t) => t.open)
      .map((t) => t.dataset.helpTopic)
      .filter((id) => siteTopics.some((t) => t.id === id));
    try {
      prefs = workspacePreferences(localStorage.getItem(WORKSPACE_UI_KEY));
    } catch {}
    prefs = { ...prefs, topics: ids };
    try {
      localStorage.setItem(WORKSPACE_UI_KEY, JSON.stringify(prefs));
    } catch {}
  });
filter();
