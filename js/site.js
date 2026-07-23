var CONTACT_EMAIL = "Flowmations.co@gmail.com";

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

// Cost calculator: conservative napkin math — assumes only 1 in 4 missed
// calls would actually have booked. 4.33 = average weeks per month.
var calcCalls = document.getElementById("calcCalls");
var calcValue = document.getElementById("calcValue");
if (calcCalls && calcValue) {
  var fmtUSD = function (n) { return "$" + n.toLocaleString("en-US"); };
  var updateCalc = function () {
    var calls = +calcCalls.value;
    var value = +calcValue.value;
    document.getElementById("calcCallsOut").textContent = calls;
    document.getElementById("calcValueOut").textContent = fmtUSD(value);
    var monthly = Math.round(calls * 4.33 * 0.25 * value);
    document.getElementById("calcMonthly").textContent = fmtUSD(monthly);
    document.getElementById("calcYearly").textContent = fmtUSD(monthly * 12);
    var mult = monthly / 900;
    document.getElementById("calcCompare").textContent = mult >= 2
      ? "That’s " + Math.round(mult) + "× the monthly cost of the Growth plan."
      : "The Growth plan is $900/month — a few saved jobs cover it.";
  };
  calcCalls.addEventListener("input", updateCalc);
  calcValue.addEventListener("input", updateCalc);
  updateCalc();
}

// Count the big stat numbers up when they scroll into view
var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function countUp(el) {
  var m = el.textContent.match(/^(\d+)(.*)$/);
  if (!m) return;
  var target = +m[1], suffix = m[2], start = null;
  function tick(now) {
    if (start === null) start = now;
    var p = Math.min((now - start) / 900, 1);
    p = 1 - Math.pow(1 - p, 3); // ease out
    el.textContent = Math.round(target * p) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
var statObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      if (!reduceMotion) countUp(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.6 });
document.querySelectorAll(".stat-num").forEach(function (el) { statObserver.observe(el); });

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
