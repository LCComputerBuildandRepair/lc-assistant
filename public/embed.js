/**
 * LC Computer Build & Repair — chat widget embed.
 *
 * Add this ONE line to your website, just before </body>:
 *   <script src="https://YOUR-APP-DOMAIN/embed.js" async></script>
 *
 * It adds a floating chat button that opens the AI assistant (from /widget).
 */
(function () {
  var script = document.currentScript;
  // Derive the app origin from this script's own URL.
  var origin = script ? new URL(script.src).origin : window.location.origin;
  var accent = (script && script.getAttribute("data-accent")) || "#0f172a";

  var open = false;

  // Floating button
  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Chat with us");
  btn.innerHTML = "💬";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: "none",
    background: accent,
    color: "#fff",
    fontSize: "24px",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
    zIndex: "2147483000",
  });

  // Chat panel (iframe)
  var panel = document.createElement("div");
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "88px",
    right: "20px",
    width: "380px",
    maxWidth: "calc(100vw - 40px)",
    height: "560px",
    maxHeight: "calc(100vh - 120px)",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
    display: "none",
    zIndex: "2147483000",
    background: "#fff",
  });

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/widget";
  Object.assign(iframe.style, { width: "100%", height: "100%", border: "none" });
  iframe.setAttribute("title", "Chat with LC Computer Build & Repair");
  panel.appendChild(iframe);

  function toggle() {
    open = !open;
    panel.style.display = open ? "block" : "none";
    btn.innerHTML = open ? "✕" : "💬";
  }
  btn.addEventListener("click", toggle);

  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  }
  if (document.body) mount();
  else window.addEventListener("DOMContentLoaded", mount);
})();
