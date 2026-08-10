(function () {
  var key = "guardrails-theme";
  var stored;
  try { stored = localStorage.getItem(key); } catch {}
  var preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  var dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
}());
