/**
 * Wires the website's "Send Message" contact form to the assistant's
 * /api/contact endpoint (saves the message + texts/emails the owner).
 * The form is JS-built with fields #fn #ln #em #sv #msg and a "Send Message" button.
 */
(function () {
  function wire() {
    var btn = Array.prototype.find.call(
      document.querySelectorAll("button"),
      function (b) {
        return /send message/i.test(b.textContent || "");
      }
    );
    if (!btn || btn.dataset.lcWired) return;
    btn.dataset.lcWired = "1";
    btn.onclick = null; // drop the site's inert handler

    btn.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var val = function (id) {
          var el = document.getElementById(id);
          return el ? el.value.trim() : "";
        };
        var name = [val("fn"), val("ln")].filter(Boolean).join(" ");
        var email = val("em");
        var service = val("sv");
        var message = val("msg");
        if (!name || !message) {
          alert("Please add your name and a message.");
          return;
        }
        var original = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Sending…";
        fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, email: email, service: service, message: message }),
        })
          .then(function (r) {
            return r.json().then(function (d) {
              return { ok: r.ok, d: d };
            });
          })
          .then(function (x) {
            if (x.ok) {
              btn.textContent = "Sent ✓ — we'll be in touch!";
              ["fn", "ln", "em", "msg"].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.value = "";
              });
            } else {
              btn.disabled = false;
              btn.textContent = original;
              alert((x.d && x.d.error) || "Something went wrong — please try again.");
            }
          })
          .catch(function () {
            btn.disabled = false;
            btn.textContent = original;
            alert("Couldn't send — please try again.");
          });
      },
      true // capture phase, before any site handler
    );
  }

  if (document.readyState !== "loading") wire();
  else document.addEventListener("DOMContentLoaded", wire);
})();
