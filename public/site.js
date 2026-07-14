/* Shared nav + footer + interactions for every page. */
(function () {
  document.documentElement.classList.add("js");

  var path = location.pathname.replace(/\/$/, "") || "/";
  var links = [
    { href: "/repair", label: "Repair" },
    { href: "/websites", label: "Websites" },
    { href: "/homecalls", label: "Home Calls" },
    { href: "/commercial", label: "Commercial" },
    { href: "/gallery", label: "Our Work" },
  ];
  var navHTML =
    '<div class="wrap nav">' +
    '<a href="/" class="brand" aria-label="LC Computer Build and Repair home"><img class="logo-img" src="/photos/logo.png" alt="LC Computer Build & Repair" /></a>' +
    '<nav class="nav-links" id="navlinks">' +
    links
      .map(function (l) {
        var active = path === l.href ? " active" : "";
        return '<a class="link' + active + '" href="' + l.href + '">' + l.label + "</a>";
      })
      .join("") +
    '<a class="btn btn-primary" href="/book">Book Now</a>' +
    "</nav>" +
    '<button class="menu-toggle" id="menuToggle" aria-label="Menu">☰</button>' +
    "</div>";

  var footHTML =
    '<div class="wrap"><div class="foot">' +
    '<div class="col" style="max-width:22rem"><img class="logo-img" src="/photos/logo.png" alt="LC Computer Build & Repair" style="height:44px;margin-bottom:16px" /><p>Expert computer repair, custom gaming builds, and professional website design in Mansfield, Ohio.</p></div>' +
    '<div class="col"><h5>Services</h5><a href="/repair">Computer Repair</a><a href="/homecalls">Home Calls</a><a href="/commercial">Commercial &amp; POS</a><a href="/websites">Website Design</a></div>' +
    '<div class="col"><h5>Company</h5><a href="/gallery">Our Work</a><a href="/book">Book Now</a><a href="/quote">Get a Quote</a><a href="/#contact">Contact</a></div>' +
    '<div class="col"><h5>Location</h5><p>Mansfield, Ohio</p><p>Serving the surrounding area</p><p>Remote web design available</p></div>' +
    "</div><div class=\"copyright\"><span>© 2026 LC Computer Build &amp; Repair · Mansfield, Ohio</span><span>Custom built website — just like yours can be.</span></div></div>";

  function mount() {
    var nav = document.getElementById("site-nav");
    var foot = document.getElementById("site-footer");
    if (nav) nav.innerHTML = navHTML;
    if (foot) foot.innerHTML = footHTML;

    var hdr = document.getElementById("site-nav");
    window.addEventListener("scroll", function () {
      if (hdr) hdr.classList.toggle("scrolled", window.scrollY > 20);
    });
    var mt = document.getElementById("menuToggle"), nl = document.getElementById("navlinks");
    if (mt && nl) {
      mt.addEventListener("click", function () { nl.classList.toggle("open"); });
      nl.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { nl.classList.remove("open"); }); });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

    try { motion(); } catch (err) {
      // Failsafe: never leave animated content hidden.
      document.querySelectorAll(".cine-in").forEach(function (el) { el.classList.add("shown"); });
    }
  }

  // ---- Flagship motion engine (progressive enhancement) ----
  function motion() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reveal above-the-fold hero items immediately, staggered.
    var hero = document.querySelector(".cine-hero");
    if (hero) {
      var heroItems = hero.querySelectorAll(".cine-in");
      heroItems.forEach(function (el, i) {
        setTimeout(function () { el.classList.add("shown"); }, reduce ? 0 : 120 + i * 130);
      });
    }

    // Reveal other .cine-in on scroll, staggered by group.
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var sibs = Array.prototype.slice.call(e.target.parentElement ? e.target.parentElement.querySelectorAll(":scope > .cine-in") : [e.target]);
        var idx = Math.max(0, sibs.indexOf(e.target));
        setTimeout(function () { e.target.classList.add("shown"); }, reduce ? 0 : idx * 90);
        cio.unobserve(e.target);
      });
    }, { threshold: 0.14 });
    document.querySelectorAll(".cine-in").forEach(function (el) {
      if (hero && hero.contains(el)) return; // hero handled above
      cio.observe(el);
    });

    // Animated counters.
    var counters = document.querySelectorAll("[data-count]");
    var counterSeen = new WeakSet();
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || counterSeen.has(e.target)) return;
        counterSeen.add(e.target);
        animateCount(e.target, reduce);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { countIO.observe(el); });

    // Parallax (throttled with rAF).
    var parallax = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
    if (parallax.length && !reduce) {
      var ticking = false;
      var onScroll = function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY || window.pageYOffset;
          parallax.forEach(function (el) {
            var f = parseFloat(el.getAttribute("data-parallax")) || 0.15;
            el.style.transform = "translate3d(0," + (y * f).toFixed(1) + "px,0)";
          });
          ticking = false;
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // Magnetic buttons (desktop only, subtle).
    if (!reduce && window.matchMedia("(hover: hover)").matches) {
      document.querySelectorAll(".btn-xl, .btn-lg").forEach(function (btn) {
        btn.addEventListener("mousemove", function (ev) {
          var r = btn.getBoundingClientRect();
          var mx = ev.clientX - r.left - r.width / 2;
          var my = ev.clientY - r.top - r.height / 2;
          btn.style.transform = "translate(" + mx * 0.18 + "px," + my * 0.28 + "px)";
        });
        btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
      });
    }
  }

  function animateCount(el, reduce) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = prefix + target + suffix; return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (document.readyState !== "loading") mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
