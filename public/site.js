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
  }

  if (document.readyState !== "loading") mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
