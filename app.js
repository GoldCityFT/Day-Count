const START_DATE = new Date("2026-07-12T14:54:00+07:00");
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
  goalMonthDetail: document.querySelector("#goalMonthDetail"),
  goalDay12Detail: document.querySelector("#goalDay12Detail"),
  goalYearDetail: document.querySelector("#goalYearDetail"),
  installButton: document.querySelector("#installButton"),
  statusText: document.querySelector("#statusText"),
  toast: document.querySelector("#toast")
};

let deferredInstallPrompt = null;

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

function atStartOfLocalDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
}

function calendarDayNumber(date) {
  return (
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ) / DAY_MS
  );
}

function diffCalendarDays(start, end) {
  return Math.round(
    calendarDayNumber(end) -
    calendarDayNumber(start)
  );
}

function calculateElapsed(start, end) {
  const startDay = atStartOfLocalDay(start);
  const endDay = atStartOfLocalDay(end);

  // คำนวณจำนวนปีตามวันที่ปฏิทิน
  let years =
    endDay.getFullYear() -
    startDay.getFullYear();

  if (addYearsClamped(startDay, years) > endDay) {
    years--;
  }

  const afterYears =
    addYearsClamped(startDay, years);

  // คำนวณจำนวนเดือนตามวันที่ปฏิทิน
  let months =
    (endDay.getFullYear() -
      afterYears.getFullYear()) *
      12 +
    (endDay.getMonth() -
      afterYears.getMonth());

  if (
    addMonthsClamped(afterYears, months) >
    endDay
  ) {
    months--;
  }

  const afterMonths =
    addMonthsClamped(afterYears, months);

  // วันเพิ่มทันทีเมื่อข้ามเวลา 00:00
  const days =
    diffCalendarDays(afterMonths, endDay);

  const totalDays =
    diffCalendarDays(startDay, endDay);

  /*
   * วันแรกเริ่มจับเวลาจาก 14:54
   * เมื่อข้ามวันแล้ว ชั่วโมงจะเริ่มใหม่จาก 00:00
   */
  const clockAnchor =
    totalDays === 0 ? start : endDay;

  let remainingMs = Math.max(
    0,
    end.getTime() - clockAnchor.getTime()
  );

  const hours =
    Math.floor(remainingMs / 3600000);

  remainingMs -= hours * 3600000;

  const minutes =
    Math.floor(remainingMs / 60000);

  remainingMs -= minutes * 60000;

  const seconds =
    Math.floor(remainingMs / 1000);

  // ใช้สำหรับคำนวณวงแหวนเป้าหมาย
  const exactTotalDays =
    totalDays +
    (end.getTime() - endDay.getTime()) /
      DAY_MS;

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    totalDays,
    exactTotalDays
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function formatThaiDateTime(date) {
  const dateText = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);

  const timeText = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);

  return `${dateText} เวลา ${timeText} น.`;
}

function getNextOneMonthMark(now) {
  let target = new Date(START_DATE);

  while (target <= now) {
    target = addMonthsClamped(target, 1);
  }

  return target;
}

function getNextMonthlyDay12(now) {
  let target = new Date(
    now.getFullYear(),
    now.getMonth(),
    12,
    0, 0, 0, 0
  );

  if (target <= now) {
    target = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      12,
      0, 0, 0, 0
    );
  }

  return target;
}

function getNextYearlyAnniversary(now) {
  let target = new Date(
    now.getFullYear(),
    6, 12,
    14, 54, 0, 0
  );

  if (target <= now) {
    target = new Date(
      now.getFullYear() + 1,
      6, 12,
      14, 54, 0, 0
    );
  }

  return target;
}

function formatRemaining(target, now) {
  let ms = Math.max(0, target.getTime() - now.getTime());

  const days = Math.floor(ms / DAY_MS);
  ms -= days * DAY_MS;

  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;

  const minutes = Math.floor(ms / 60000);

  return `เหลืออีก ${formatNumber(days)} วัน ${String(hours).padStart(2, "0")} ชม. ${String(minutes).padStart(2, "0")} นาที`;
}


function render() {
  const now = new Date();

  if (now < START_DATE) {
    elements.years.textContent = "0";
    elements.months.textContent = "0";
    elements.days.textContent = "0";
    elements.totalDays.textContent = "0";
    elements.liveClock.textContent = "00:00:00";
    return;
  }

  const elapsed = calculateElapsed(
    START_DATE,
    now
  );


  elements.counterTitle.textContent =
    COUNTER_TITLE;

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
    .map(value =>
      String(value).padStart(2, "0")
    )
    .join(":");

  elements.startDateText.textContent =
    "12 กรกฎาคม 2569 เวลา 14:54 น.";


  const circumference = 2 * Math.PI * 18;

  const offset =
    circumference * (1 - milestone.progress);


  document.title =
    `${COUNTER_TITLE} • ${
      formatNumber(elapsed.totalDays)
    } วัน`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  window.clearTimeout(showToast.timeoutId);

  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2800);
}

window.addEventListener(
  "beforeinstallprompt",
  event => {
    event.preventDefault();
    deferredInstallPrompt = event;

    elements.installButton.classList.remove(
      "hidden"
    );
  }
);

elements.installButton.addEventListener(
  "click",
  async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();

      await deferredInstallPrompt.userChoice;

      deferredInstallPrompt = null;

      elements.installButton.classList.add(
        "hidden"
      );

      return;
    }

    const isIOS =
      /iphone|ipad|ipod/i.test(
        navigator.userAgent
      );

    showToast(
      isIOS
        ? "บน iPhone: กด Share แล้วเลือก Add to Home Screen"
        : "เปิดเมนูเบราว์เซอร์ แล้วเลือกเพิ่มไปยังหน้าจอหลัก"
    );
  }
);

window.addEventListener(
  "appinstalled",
  () => {
    elements.installButton.classList.add(
      "hidden"
    );

    elements.statusText.textContent =
      "ติดตั้งบนหน้าจอเรียบร้อยแล้ว";

    showToast(
      "เพิ่มไว้บนหน้าจอมือถือแล้ว"
    );
  }
);

function init() {
  const isIOS =
    /iphone|ipad|ipod/i.test(
      navigator.userAgent
    );

  const isStandalone =
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    navigator.standalone === true;

  if (isIOS && !isStandalone) {
    elements.installButton.classList.remove(
      "hidden"
    );
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener(
      "load",
      () => {
        navigator.serviceWorker
          .register("./service-worker.js")
          .catch(error => {
            console.warn(
              "ลงทะเบียน Service Worker ไม่สำเร็จ",
              error
            );
          });
      }
    );
  }

  render();
  window.setInterval(render, 1000);
}

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState === "visible"
    ) {
      render();
    }
  }
);

init();
