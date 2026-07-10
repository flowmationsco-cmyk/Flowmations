// TODO: swap this placeholder for the real Flowmations contact email.
var CONTACT_EMAIL = "youremail@example.com";

// Wire the direct-email links
document.querySelectorAll("#mailLink, #footerMail").forEach(function (a) {
  a.href = "mailto:" + CONTACT_EMAIL;
  a.title = CONTACT_EMAIL;
});

// Contact form: no backend yet, so compose the message into the visitor's
// email app. Swap for a real form endpoint (e.g. Formspree) later if wanted.
document.getElementById("contactForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var f = e.target;
  var subject = "Quote request from " + f.name.value +
    (f.company.value ? " (" + f.company.value + ")" : "");
  var body = "Name: " + f.name.value +
    "\nCompany: " + (f.company.value || "-") +
    "\nEmail: " + f.email.value +
    "\n\n" + f.message.value;
  location.href = "mailto:" + CONTACT_EMAIL +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(body);
});

// Mobile nav
var toggle = document.getElementById("navToggle");
var links = document.getElementById("navLinks");
toggle.addEventListener("click", function () {
  var open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
links.addEventListener("click", function (e) {
  if (e.target.tagName === "A") {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// Reveal sections as they scroll into view (CSS handles reduced motion)
var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(function (el) { observer.observe(el); });

document.getElementById("year").textContent = new Date().getFullYear();
