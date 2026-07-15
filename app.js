const START_DATE = new Date(2026, 6, 12, 14, 54, 0);
const COUNTER_TITLE = "ช่วงเวลาของฉัน";
const DAY_MS = 24 * 60 * 60 * 1000;

const elements = {
  counterTitle: document.querySelector("#counterTitle"),
  years: document.querySelector("#years"),
  months: document.querySelector("#months"),
  days: document.querySelector("#days"),
  totalDays: document.querySelector("#totalDays"),
  liveClock: document.querySelector("#liveClock"),
  startDateText: document.querySelector("#startDateText"),
  milestoneTitle: document.querySelector("#milestoneTitle"),
  milestoneDetail: document.querySelector("#milestoneDetail"),
  progressCircle: document.querySelector("#progressCircle"),
  progressPercent: document.querySelector("#progressPercent"),
  installButton: document.querySelector("#installButton"),
  statusText: document.querySelector("#statusText"),
  toast: document.querySelector("#toast")
};

let settings = loadSettings();
let deferredInstallPrompt = null;
let timerId = null;

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function atStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addYearsClamped(date, years) {
  const targetYear = date.getFullYear() + years;
  const targetMonth = date.getMonth();
  const targetDay = Math.min(date.getDate(), daysInMonth(targetYear, targetMonth));
  return new Date(targetYear, targetMonth, targetDay);
}

function addMonthsClamped(date, months) {
  const monthIndex = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(monthIndex / 12);
  const normalizedMonth = ((monthIndex % 12) + 12) % 12;
  const targetDay = Math.min(date.getDate(), daysInMonth(targetYear, normalizedMonth));
  return new Date(targetYear, normalizedMonth, targetDay);
}

function calendarDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

function diffCalendarDays(start, end) {
  return Math.round(calendarDayNumber(end) - calendarDayNumber(start));
}

function calculateCalendarDifference(start, end) {
  let years = end.getFullYear() - start.getFullYear();
  if (addYearsClamped(start, years) > end) years -= 1;

  const afterYears = addYearsClamped(start, years);
  let months =
    (end.getFullYear() - afterYears.getFullYear()) * 12 +
    (end.getMonth() - afterYears.getMonth());

  if (addMonthsClamped(afterYears, months) > end) months -= 1;

  const afterMonths = addMonthsClamped(afterYears, months);
  const days = diffCalendarDays(afterMonths, end);

  return { years, months, days };
}

function formatThaiDate(date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function getNextMilestone(totalDays) {
  const step = totalDays < 100 ? 10 : totalDays < 1000 ? 100 : 500;
  const target = Math.max(step, Math.ceil((totalDays + 1) / step) * step);
  const previous = target - step;
  const progress = Math.min(1, Math.max(0, (totalDays - previous) / step));
  return {
    target,
    remaining: target - totalDays,
    progress
  };
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addYearsClamped(date, years) {
  const targetYear = date.getFullYear() + years;
  const targetMonth = date.getMonth();

  const targetDay = Math.min(
    date.getDate(),
    daysInMonth(targetYear, targetMonth)
  );

  return new Date(
    targetYear,
    targetMonth,
    targetDay,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
}

function addMonthsClamped(date, months) {
  const totalMonths = date.getMonth() + months;

  const targetYear =
    date.getFullYear() + Math.floor(totalMonths / 12);

  const targetMonth =
    ((totalMonths % 12) + 12) % 12;

  const targetDay = Math.min(
    date.getDate(),
    daysInMonth(targetYear, targetMonth)
  );

  return new Date(
    targetYear,
    targetMonth,
    targetDay,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
}

function calculateElapsed(start, end) {
  let years = end.getFullYear() - start.getFullYear();

  if (addYearsClamped(start, years) > end) {
    years--;
  }

  const afterYears = addYearsClamped(start, years);

  let months =
    (end.getFullYear() - afterYears.getFullYear()) * 12 +
    (end.getMonth() - afterYears.getMonth());

  if (addMonthsClamped(afterYears, months) > end) {
    months--;
  }

  const afterMonths = addMonthsClamped(afterYears, months);

  let remainingMs = end.getTime() - afterMonths.getTime();

  const days = Math.floor(remainingMs / DAY_MS);
  remainingMs -= days * DAY_MS;

  const hours = Math.floor(remainingMs / 3600000);
  remainingMs -= hours * 3600000;

  const minutes = Math.floor(remainingMs / 60000);
  remainingMs -= minutes * 60000;

  const seconds = Math.floor(remainingMs / 1000);

  const totalDays = Math.floor(
    (end.getTime() - start.getTime()) / DAY_MS
  );

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    totalDays
  };
}

function render() {
  const now = new Date();
  const elapsed = calculateElapsed(START_DATE, now);

  elements.counterTitle.textContent = COUNTER_TITLE;

  elements.years.textContent =
    formatNumber(elapsed.years);

  elements.months.textContent =
    formatNumber(elapsed.months);

  elements.days.textContent =
    formatNumber(elapsed.days);

  elements.totalDays.textContent =
    formatNumber(elapsed.totalDays);

  elements.liveClock.textContent = [
    elapsed.hours,
    elapsed.minutes,
    elapsed.seconds
  ]
    .map(value => String(value).padStart(2, "0"))
    .join(":");

  elements.startDateText.textContent =
    "12 กรกฎาคม 2569 เวลา 14:54 น.";

  document.title =
    `${COUNTER_TITLE} • ${formatNumber(elapsed.totalDays)} วัน`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2800);
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.classList.remove("hidden");
});

elements.installButton.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    elements.installButton.classList.add("hidden");
    return;
  }

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  showToast(
    isIOS
      ? "บน iPhone: กด Share แล้วเลือก Add to Home Screen"
      : "เปิดเมนูเบราว์เซอร์ แล้วเลือกเพิ่มไปยังหน้าจอหลัก"
  );
});

window.addEventListener("appinstalled", () => {
  elements.installButton.classList.add("hidden");
  elements.statusText.textContent = "ติดตั้งบนหน้าจอเรียบร้อยแล้ว";
  showToast("เพิ่มไว้บนหน้าจอมือถือแล้ว");
});

function init() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  if (isIOS && !isStandalone) {
    elements.installButton.classList.remove("hidden");
  }

  function init() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .catch(error => {
          console.warn(
            "ลงทะเบียน Service Worker ไม่สำเร็จ",
            error
          );
        });
    });
  }

  render();
  window.setInterval(render, 1000);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") render();
});

init();
