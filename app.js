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
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  titleInput: document.querySelector("#titleInput"),
  dateInput: document.querySelector("#dateInput"),
  accentInput: document.querySelector("#accentInput"),
  installButton: document.querySelector("#installButton"),
  statusText: document.querySelector("#statusText"),
  toast: document.querySelector("#toast")
};

let settings = loadSettings();
let deferredInstallPrompt = null;
let timerId = null;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.startDate) {
      return {
        title: saved.title || "ช่วงเวลาของฉัน",
        startDate: saved.startDate,
        accent: saved.accent || "violet"
      };
    }
  } catch (error) {
    console.warn("อ่านค่าที่บันทึกไว้ไม่สำเร็จ", error);
  }
  return null;
}

function saveSettings(nextSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
}

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

function render() {
  if (!settings) return;

  const now = new Date();
  const today = atStartOfDay(now);
  const start = parseLocalDate(settings.startDate);

  if (start > today) {
    showToast("วันที่เริ่มต้นยังมาไม่ถึง กรุณาเลือกวันที่ใหม่");
    openSettings();
    return;
  }

  const calendarDiff = calculateCalendarDifference(start, today);
  const totalDays = diffCalendarDays(start, today);
  const milestone = getNextMilestone(totalDays);

  elements.counterTitle.textContent = settings.title;
  elements.years.textContent = formatNumber(calendarDiff.years);
  elements.months.textContent = formatNumber(calendarDiff.months);
  elements.days.textContent = formatNumber(calendarDiff.days);
  elements.totalDays.textContent = formatNumber(totalDays);
  elements.startDateText.textContent = formatThaiDate(start);

  const elapsedToday = now - today;
  const hours = Math.floor(elapsedToday / 3600000);
  const minutes = Math.floor((elapsedToday % 3600000) / 60000);
  const seconds = Math.floor((elapsedToday % 60000) / 1000);
  elements.liveClock.textContent = [hours, minutes, seconds]
    .map(value => String(value).padStart(2, "0"))
    .join(":");

  elements.milestoneTitle.textContent = `ครบ ${formatNumber(milestone.target)} วัน`;
  elements.milestoneDetail.textContent =
    milestone.remaining === 1
      ? "เหลืออีก 1 วัน"
      : `เหลืออีก ${formatNumber(milestone.remaining)} วัน`;

  const circumference = 2 * Math.PI * 18;
  const offset = circumference * (1 - milestone.progress);
  elements.progressCircle.style.strokeDasharray = circumference.toFixed(1);
  elements.progressCircle.style.strokeDashoffset = offset.toFixed(1);
  elements.progressPercent.textContent = `${Math.round(milestone.progress * 100)}%`;

  document.documentElement.dataset.accent = settings.accent;
  document.title = `${settings.title} • ${formatNumber(totalDays)} วัน`;
}

function fillSettingsForm() {
  const today = new Date();
  elements.dateInput.max = toLocalISODate(today);

  if (settings) {
    elements.titleInput.value = settings.title;
    elements.dateInput.value = settings.startDate;
    elements.accentInput.value = settings.accent;
  } else {
    elements.titleInput.value = "ช่วงเวลาของฉัน";
    elements.dateInput.value = toLocalISODate(today);
    elements.accentInput.value = "violet";
  }
}

function openSettings() {
  fillSettingsForm();
  if (!elements.settingsDialog.open) {
    elements.settingsDialog.showModal();
  }
}

function closeSettings() {
  if (elements.settingsDialog.open && settings) {
    elements.settingsDialog.close();
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2800);
}

elements.settingsButton.addEventListener("click", openSettings);
elements.closeDialogButton.addEventListener("click", closeSettings);

elements.settingsDialog.addEventListener("cancel", event => {
  if (!settings) {
    event.preventDefault();
  }
});

elements.settingsForm.addEventListener("submit", event => {
  event.preventDefault();

  const startDate = elements.dateInput.value;
  const title = elements.titleInput.value.trim() || "ช่วงเวลาของฉัน";
  const accent = elements.accentInput.value;

  if (!startDate) {
    showToast("กรุณาเลือกวันที่เริ่มต้น");
    return;
  }

  const selectedDate = parseLocalDate(startDate);
  if (selectedDate > atStartOfDay(new Date())) {
    showToast("วันที่เริ่มต้นต้องไม่เกินวันนี้");
    return;
  }

  settings = { title, startDate, accent };
  saveSettings(settings);
  elements.settingsDialog.close();
  render();
  showToast("บันทึกเรียบร้อย");
});

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

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(error => {
        console.warn("ลงทะเบียน Service Worker ไม่สำเร็จ", error);
      });
    });
  }

  if (!settings) {
    openSettings();
  } else {
    render();
  }

  timerId = window.setInterval(render, 1000);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") render();
});

init();
