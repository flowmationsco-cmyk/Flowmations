// Leak-check survey: saves answers in the browser, tracks progress, shows an
// instant leak estimate on submit, and emails a copy of the answers to the
// founders via FormSubmit (free relay, no backend needed).
var CONTACT_EMAIL = "Flowmations.co@gmail.com";
var RELAY_URL = "https://formsubmit.co/ajax/" + CONTACT_EMAIL;

var form = document.getElementById("surveyForm");
var STORE_KEY = "flowmations-leak-survey-v1";

document.querySelectorAll("#footerMail").forEach(function (a) {
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

// Conservative napkin math: only 1 in 4 missed calls would have booked,
// and only half of no-shows are truly lost.
var CALLS_PER_WEEK = { "0–2": 1, "3–5": 4, "6–10": 8, "More than 10": 12, "Honestly, no idea": 5 };
var JOB_VALUE = { "Under $50": 35, "$50–$100": 75, "$100–$300": 200, "$300+": 400 };
var NOSHOWS_PER_WEEK = { "None": 0, "1–2": 1.5, "3–5": 4, "More than 5": 6, "N/A": 0 };

function fmtUSD(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

function buildEstimate() {
  var calls = CALLS_PER_WEEK[valueFor("Missed calls per week")];
  var value = JOB_VALUE[valueFor("Average visit or job worth")];
  var noshows = NOSHOWS_PER_WEEK[valueFor("No-shows per week")];
  var reviews = valueFor("Ask for Google reviews");

  var lines = [];
  var total = 0;
  if (calls !== undefined && value !== undefined) {
    var missedYear = calls * 52 * 0.25 * value;
    total += missedYear;
    lines.push("Missed calls: about " + fmtUSD(missedYear) +
      " a year, even assuming only 1 in 4 would have booked.");
  }
  if (noshows !== undefined && value !== undefined && noshows > 0) {
    var noshowYear = noshows * 52 * 0.5 * value;
    total += noshowYear;
    lines.push("No-shows: about " + fmtUSD(noshowYear) +
      " a year, assuming only half of them never rebook.");
  }
  if (reviews === "Rarely or never" || reviews === "When we remember") {
    lines.push("Reviews: hard to put a number on, but the business that asks every time is the one Google shows first.");
  }
  if (total > 0) {
    var kept = total * 0.5;
    var mult = kept / (900 * 12);
    var line = "Your estimated saving with Flowmations: about " + fmtUSD(kept) +
      " a year, even if we only plug half the leak";
    if (mult >= 2) line += " — that's " + Math.round(mult) + "× what the Growth plan costs.";
    else line += ".";
    lines.push(line);
  }
  return { total: total, lines: lines };
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

  // Show the instant estimate right away.
  var est = buildEstimate();
  var box = document.getElementById("reportBox");
  var totalEl = document.getElementById("reportTotal");
  var subEl = box.querySelector(".report-sub");
  var linesEl = document.getElementById("reportLines");
  linesEl.innerHTML = "";
  if (est.total > 0) {
    totalEl.textContent = fmtUSD(est.total);
    totalEl.hidden = false;
    subEl.textContent = "Roughly what's walking out the door every year.";
  } else {
    totalEl.hidden = true;
    subEl.textContent = "Answer questions 4–6 to see a dollar estimate — we'll still run your numbers and text you the breakdown.";
  }
  est.lines.forEach(function (t) {
    var li = document.createElement("li");
    li.textContent = t;
    linesEl.appendChild(li);
  });
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });

  // Send a copy of the answers to the founders.
  var status = document.getElementById("reportStatus");
  status.textContent = "Sending your answers to Flowmations…";
  var payload = {
    _subject: "Leak check: " + valueFor("Your name") +
      (valueFor("Business name") ? " — " + valueFor("Business name") : ""),
    _template: "table",
    _captcha: "false"
  };
  questionNames().forEach(function (n) {
    payload[n] = valueFor(n) || "(skipped)";
  });
  if (est.total > 0) {
    payload["Estimated yearly leak"] = fmtUSD(est.total);
    payload["Estimated yearly saving (half the leak)"] = fmtUSD(est.total * 0.5);
  }

  fetch(RELAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload)
  }).then(function (res) {
    if (!res.ok) throw new Error("relay error");
    return res.json();
  }).then(function () {
    status.textContent = "Done — your answers are with us. Watch your texts for the full breakdown.";
  }).catch(function () {
    var subject = payload._subject;
    var body = questionNames().map(function (n) {
      return n + ": " + (valueFor(n) || "(skipped)");
    }).join("\n");
    status.innerHTML = "Hmm, sending didn't go through. " +
      '<a href="mailto:' + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body) +
      '">Tap here to email us your answers instead</a> — same result.';
  });
});

load();
updateProgress();
