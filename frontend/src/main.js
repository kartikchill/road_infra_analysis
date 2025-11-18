// src/main.js
console.log("Frontend Loaded 🔥");

const BACKEND = "http://localhost:8002"; // backend URL

// DOM elements
const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
const cameraButton = document.getElementById("cameraButton");
const previewArea = document.getElementById("previewArea");
const analyseBtn = document.getElementById("analyseBtn");
const resultBox = document.getElementById("resultBox");
const rdsText = document.getElementById("rdsText");
const valuesText = document.getElementById("valuesText");
const progressBar = document.getElementById("progressBar");
const snapshotContainer = document.getElementById("snapshot-container");
const fileNameEl = document.getElementById("fileName");
const scoreModal = document.getElementById("scoreModal");
const levelsEl = document.getElementById("levels");

let selectedFile = null;
let progressInterval = null;

// ----------------------------
//  ROAD SCORE LEVEL SYSTEM
// ----------------------------
const LEVELS = [
  { range: [0,10], label: "Extremely Poor" },
  { range: [10,20], label: "Very Poor" },
  { range: [20,30], label: "Poor" },
  { range: [30,40], label: "Below Average" },
  { range: [40,50], label: "Fair - Needs Improvements" },
  { range: [50,60], label: "Acceptable" },
  { range: [60,70], label: "Good" },
  { range: [70,80], label: "Very Good" },
  { range: [80,90], label: "Excellent" },
  { range: [90,100], label: "Pristine" },
];

function renderLevels() {
  levelsEl.innerHTML = "";
  LEVELS.forEach((lv) => {
    const d = document.createElement("div");
    d.className = "box";
    d.style.minWidth = "140px";
    d.style.margin = "6px";
    d.style.padding = "10px";
    d.style.background = "rgba(0,0,0,0.35)";
    d.style.border = "1px solid rgba(255,137,53,0.08)";
    d.style.borderRadius = "8px";
    d.style.color = "#ffd966";
    d.innerHTML = `<strong>${lv.range[0]} - ${lv.range[1]}</strong><br><small>${lv.label}</small>`;
    levelsEl.appendChild(d);
  });
}
renderLevels();

// ----------------------------
// FILE UPLOAD
// ----------------------------
document.getElementById("uploadImage").onclick = () => imageInput.click();
document.getElementById("uploadVideo").onclick = () => videoInput.click();

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;
  fileNameEl.textContent = file.name;

  previewArea.innerHTML = "";
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  previewArea.appendChild(img);

  analyseBtn.style.display = "inline-block";
});

videoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;
  fileNameEl.textContent = file.name;

  previewArea.innerHTML = "";
  const vid = document.createElement("video");
  vid.src = URL.createObjectURL(file);
  vid.controls = true;
  previewArea.appendChild(vid);

  analyseBtn.style.display = "inline-block";
});

// ----------------------------
// LOADING BAR
// ----------------------------
function showProgress() {
  progressBar.style.display = "block";
  const inner = progressBar.querySelector("div");
  inner.style.width = "10%";
  let pct = 10;

  progressInterval = setInterval(() => {
    pct = Math.min(95, pct + Math.random() * 10);
    inner.style.width = pct + "%";
  }, 500);
}

function stopProgress() {
  const inner = progressBar.querySelector("div");
  inner.style.width = "0%";
  progressBar.style.display = "none";

  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// ----------------------------
// ANALYSE BUTTON
// ----------------------------
analyseBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    alert("Select an image or video");
    return;
  }

  resultBox.style.display = "block";
  snapshotContainer.innerHTML = "";
  rdsText.textContent = "Analysing...";
  valuesText.textContent = "";

  showProgress();

  const fd = new FormData();
  fd.append("file", selectedFile);

  try {

    let endpoint =
      selectedFile.type.startsWith("image")
        ? "/analyze/image"
        : "/analyze/video";

    const res = await fetch(BACKEND + endpoint, {
      method: "POST",
      body: fd
    });

    const data = await res.json();

    stopProgress();

    const s = data.summary || {};
    const rds = Number(s.avg_RDS || 0);

    rdsText.innerHTML = `Road Quality Score (RDS): <span style="font-size:30px; color:#fff">${rds.toFixed(
      2
    )}</span>`;

    valuesText.innerHTML = `
      <div>Potholes: ${Number(s.avg_potholes || 0).toFixed(4)}</div>
      <div>Roughness: ${Number(s.avg_rough || 0).toFixed(4)}</div>
      <div>Lanes: ${Number(s.avg_lanes || 0).toFixed(4)}</div>
      <div>Signs: ${Number(s.avg_signs || 0).toFixed(4)}</div>
    `;

    highlightLevel(rds);

    // snapshots only for video
    if (data.input_path) {
      const snapRes = await fetch(
        BACKEND + "/snapshot_annotated?video_path=" + encodeURIComponent(data.input_path),
        { method: "POST" }
      );

      const snap = await snapRes.json();
      displaySnapshots(snap.samples || []);
    }

  } catch (err) {
    stopProgress();
    console.error(err);
    rdsText.textContent = "ERROR analysing file ❌";
  }
});

// ----------------------------
// SNAPSHOT IMAGES
// ----------------------------
function displaySnapshots(samples) {
  snapshotContainer.innerHTML = "";

  if (!samples.length) {
    snapshotContainer.innerHTML = "<div>No sample frames available</div>";
    return;
  }

  samples.forEach((p) => {
    const img = document.createElement("img");
    img.src = BACKEND + p;
    img.style.cursor = "pointer";
    img.onclick = () => window.open(img.src, "_blank");
    snapshotContainer.appendChild(img);
  });
}

// ----------------------------
// HIGHLIGHT RDS LEVEL
// ----------------------------
function highlightLevel(rds) {
  scoreModal.classList.add("show");

  [...levelsEl.children].forEach((el) => {
    el.style.boxShadow = "none";
    el.style.border = "1px solid rgba(255,137,53,0.08)";
    el.style.transform = "scale(1)";
  });

  const idx = LEVELS.findIndex(
    (lv) => rds >= lv.range[0] && rds < lv.range[1]
  );

  const el = levelsEl.children[idx === -1 ? 9 : idx];
  if (el) {
    el.style.boxShadow = "0 0 28px rgba(255,145,50,0.45)";
    el.style.border = "2px solid #ff8a00";
    el.style.transform = "scale(1.05)";
  }

  setTimeout(() => scoreModal.classList.remove("show"), 6000);
}