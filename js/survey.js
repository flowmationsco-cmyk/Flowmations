// Leak-check survey: saves answers in the browser, tracks progress, and
// submits by composing an email (same no-backend pattern as the contact form).
var CONTACT_EMAIL = "Flowmations.co@gmail.com";

var form = document.getElementById("surveyForm");
var STORE_KEY = "flowmations-leak-survey-v1";

document.querySelectorAll("#footerMail, #doneMail").forEach(function (a) {
  a.href = "mailto:" + CONTACT_EMAIL;
  a.title = CONTACT_EMAIL;
});
document.getElementById("year").textContent = new Date().getFullYear();

function fields() {
  return Array.prototype.slice.call(form.querySelectorAll("input"));
}
function questionNames() {
  var seen = [];
  fields().forEach(function (el) {
    if (el.name && seen.indexOf(el.name) === -1) seen.push(el.name);
  });
  return seen;
}
function valueFor(name) {
  var els = fields().filter(function (el) { return el.name === name; });
  var first = els[0];
  if (first.type === "checkbox" || first.type === "radio") {
    return els.filter(function (el) { return el.checked; })
              .map(function (el) { return el.value; }).join(", ");
  }
  return first.value.trim();
}

function save() {
  var data = {};
  fields().forEach(function (el, i) {
    if (el.type === "checkbox" || el.type === "radio") data["f" + i] = el.checked;
    else data["f" + i] = el.value;
  });
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
}
function load() {
  var raw;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) {}
  if (!raw) return;
  var data;
  try { data = JSON.parse(raw); } catch (e) { return; }
  fields().forEach(function (el, i) {
    if (!(("f" + i) in data)) return;
    if (el.type === "checkbox" || el.type === "radio") el.checked = !!data["f" + i];
    else el.value = data["f" + i];
  });
}

// Progress counts the 9 numbered questions; name + number together count as one.
function updateProgress() {
  var groups = [
    ["Business name"],
    ["Kind of business"],
    ["When someone calls mid-customer"],
    ["Missed calls per week"],
    ["Average visit or job worth"],
    ["No-shows per week"],
    ["Ask for Google reviews"],
    ["Biggest annoyances"],
    ["Your name", "Best number to text"]
  ];
  var answered = groups.filter(function (g) {
    return g.every(function (n) { return valueFor(n) !== ""; });
  }).length;
  document.getElementById("answeredCount").textContent = answered;
  document.getElementById("totalCount").textContent = groups.length;
  document.getElementById("progressFill").style.width =
    Math.round(answered / groups.length * 100) + "%";
}

form.addEventListener("input", function () { save(); updateProgress(); });

form.addEventListener("submit", function (e) {
  e.preventDefault();
  var errorNote = document.getElementById("finalError");
  if (valueFor("Your name") === "" || valueFor("Best number to text") === "") {
    errorNote.hidden = false;
    document.querySelector(".q-card-final").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  errorNote.hidden = true;

  var lines = ["WHERE'S YOUR BUSINESS LEAKING? — 2-MINUTE CHECK", ""];
  questionNames().forEach(function (n) {
    var v = valueFor(n);
    lines.push(n + ": " + (v === "" ? "(skipped)" : v));
  });
  var subject = "Leak check: " + valueFor("Your name") +
    (valueFor("Business name") ? " — " + valueFor("Business name") : "");
  location.href = "mailto:" + CONTACT_EMAIL +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(lines.join("\n"));

  var done = document.getElementById("doneBox");
  done.hidden = false;
  done.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

load();
updateProgress();
