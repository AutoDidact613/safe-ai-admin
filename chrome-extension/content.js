(function () {
  const TEXT_PATTERNS = [
    /sign\s*in/i,
    /log\s*in/i,
    /sign\s*up/i,
    /get started/i,
    /try\s+claude\s+for\s+free/i,
    /free\s+account/i,
    /התחבר/,
    /הרשמה/,
    /הירשם/,
    /חינם/
  ];

  const HIDDEN_MARKER = "data-hidden-by-extension";

  function isTargetElement(el) {
    const text = (el.textContent || "").trim();
    if (!text || text.length > 60) return false;
    return TEXT_PATTERNS.some((pattern) => pattern.test(text));
  }

  function hideMatchingElements(root) {
    const candidates = root.querySelectorAll('a, button, [role="button"]');
    candidates.forEach((el) => {
      if (el.hasAttribute(HIDDEN_MARKER)) return;
      if (isTargetElement(el)) {
        el.style.setProperty("display", "none", "important");
        el.setAttribute(HIDDEN_MARKER, "true");
      }
    });
  }

  function init() {
    hideMatchingElements(document);
    const observer = new MutationObserver(() => hideMatchingElements(document));
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
