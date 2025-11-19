console.log("Frontend Loaded 🔥");

const BACKEND = "https://oakyags-backend.hf.space";

// DOM elements
const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
const cameraButton = document.getElementById("cameraButton");
const previewContainer = document.getElementById("previewContainer");
const previewArea = document.getElementById("previewArea");
const analyseBtn = document.getElementById("analyseBtn");
const resultBox = document.getElementById("resultBox");
const rdsDisplay = document.getElementById("rdsText");
const valuesText = document.getElementById("valuesText");
const progressBar = document.getElementById("progressBar");
const progressInner = document.getElementById("progressInner");
const snapshotContainer = document.getElementById("snapshot-container");
const snapshotSection = document.getElementById("snapshotSection");
const fileNameEl = document.getElementById("fileName");
const levelsEl = document.getElementById("levels");
const resetBtn = document.getElementById("resetBtn");
const longVideoModal = document.getElementById("longVideoModal");

let selectedFile = null;
let progressInterval = null;
let currentVideoDuration = 0;

// ----------------------------
//  ROAD SCORE LEVEL SYSTEM
// ----------------------------
const LEVELS = [
  { range: [0,10], label: "Extremely Poor" },
  { range: [10,20], label: "Very Poor" },
  { range: [20,30], label: "Poor" },
  { range: [30,40], label: "Below Average" },
  { range: [40,50], label: "Fair" },
  { range: [50,60], label: "Acceptable" },
  { range: [60,70], label: "Good" },
  { range: [70,80], label: "Very Good" },
  { range: [80,90], label: "Excellent" },
  { range: [90,100], label: "Pristine" },
];

function renderLevels() {
  levelsEl.innerHTML = "";
  LEVELS.forEach((lv, index) => {
    const div = document.createElement("div");
    div.id = `level-${index}`;
    div.className = "p-2 rounded border border-transparent opacity-50 text-sm text-gray-500 text-center transition-all";
    div.innerHTML = `
      <span class="font-bold block text-lg">${lv.range[0]} - ${lv.range[1]}</span>
      <span style="font-size:10px; text-transform:uppercase;">${lv.label}</span>
    `;
    levelsEl.appendChild(div);
  });
}
renderLevels();

// ----------------------------
// FILE UPLOAD
// ----------------------------
document.getElementById("uploadImage").onclick = () => imageInput.click();
document.getElementById("uploadVideo").onclick = () => videoInput.click();

cameraButton.onclick = () => {
  imageInput.setAttribute("capture", "environment");
  imageInput.click();
};

function handleFileSelection(file) {
  if (!file) return;
  selectedFile = file;
  fileNameEl.textContent = file.name;
  currentVideoDuration = 0; // Reset

  previewContainer.classList.remove("hidden");
  resultBox.classList.add("hidden");
  snapshotSection.classList.add("hidden");

  previewArea.innerHTML = "";
  const isVideo = file.type.startsWith("video");
  const el = document.createElement(isVideo ? "video" : "img");
  el.src = URL.createObjectURL(file);
  
  if (isVideo) {
    el.controls = true;
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      currentVideoDuration = el.duration;
      console.log("Video duration:", currentVideoDuration);
    };
  }
  
  el.className = "max-w-full max-h-[400px] object-contain rounded-lg shadow-lg";
  previewArea.appendChild(el);

  analyseBtn.disabled = false;
  analyseBtn.textContent = "RUN ANALYSIS";
}

imageInput.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));
videoInput.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));

resetBtn.addEventListener("click", () => {
  selectedFile = null;
  currentVideoDuration = 0;
  previewContainer.classList.add("hidden");
  resultBox.classList.add("hidden");
  imageInput.removeAttribute("capture");
  imageInput.value = "";
  videoInput.value = "";
  longVideoModal.classList.add("hidden");
});

// ----------------------------
// PROGRESS BAR
// ----------------------------
function showProgress() {
  progressBar.classList.remove("hidden");
  progressInner.style.width = "10%";
  let pct = 10;
  progressInterval = setInterval(() => {
    pct = Math.min(95, pct + Math.random() * 10);
    progressInner.style.width = pct + "%";
  }, 800);
}

function stopProgress() {
  progressInner.style.width = "100%";
  setTimeout(() => {
    progressBar.classList.add("hidden");
    progressInner.style.width = "0%";
  }, 600);
  clearInterval(progressInterval);
}

// ----------------------------
// ANALYSE BUTTON
// ----------------------------
analyseBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  // CHECK FOR LONG VIDEO
  if (selectedFile.type.startsWith("video") && currentVideoDuration > 30) {
    longVideoModal.classList.remove("hidden");
  }

  analyseBtn.disabled = true;
  analyseBtn.textContent = "ANALYSING...";

  resultBox.classList.remove("hidden");
  rdsDisplay.innerHTML = "...";
  valuesText.innerHTML = "";
  snapshotSection.classList.add("hidden");

  showProgress();

  const fd = new FormData();
  fd.append("file", selectedFile);

  try {
    const endpoint = selectedFile.type.startsWith("image") ? "/analyze/image" : "/analyze/video";
    const res = await fetch(BACKEND + endpoint, { method: "POST", body: fd });
    const data = await res.json();
    
    stopProgress();
    analyseBtn.disabled = false;
    analyseBtn.textContent = "ANALYSIS COMPLETE";
    longVideoModal.classList.add("hidden"); // Hide modal when done

    const s = data.summary || data.details || {};
    const rds = Number(s.RDS || s.avg_RDS || 0);
    rdsDisplay.textContent = rds.toFixed(1);

    valuesText.innerHTML = `
      <div class="bg-card/50 p-4 rounded-lg border border-white/10">
        <p class="text-xs text-gray-400 uppercase">Potholes</p>
        <p class="text-2xl font-bold">${Number(s.potholes ?? s.avg_potholes ?? 0).toFixed(4)}</p>
      </div>
      <div class="bg-card/50 p-4 rounded-lg border border-white/10">
        <p class="text-xs text-gray-400 uppercase">Roughness</p>
        <p class="text-2xl font-bold">${Number(s.rough ?? s.avg_rough ?? 0).toFixed(4)}</p>
      </div>
      <div class="bg-card/50 p-4 rounded-lg border border-white/10">
        <p class="text-xs text-gray-400 uppercase">Lanes</p>
        <p class="text-2xl font-bold">${Number(s.lanes ?? s.avg_lanes ?? 0).toFixed(4)}</p>
      </div>
      <div class="bg-card/50 p-4 rounded-lg border border-white/10">
        <p class="text-xs text-gray-400 uppercase">Signs</p>
        <p class="text-2xl font-bold">${Number(s.signs ?? s.avg_signs ?? 0).toFixed(4)}</p>
      </div>
    `;

    highlightLevel(rds);

    if (data.input_path && selectedFile.type.startsWith("video")) {
      const snap = await (await fetch(BACKEND + "/snapshot_annotated?video_path=" + encodeURIComponent(data.input_path), { method: "POST" })).json();
      if (snap.samples?.length) {
        displaySnapshots(snap.samples);
        snapshotSection.classList.remove("hidden");
      }
    }

  } catch (err) {
    stopProgress();
    longVideoModal.classList.add("hidden");
    console.error(err);
    alert("Error analysing file. Ensure backend is running.");
    analyseBtn.textContent = "RETRY";
    analyseBtn.disabled = false;
  }
});

// ----------------------------
// SNAPSHOT IMAGES
// ----------------------------
function displaySnapshots(samples) {
  snapshotContainer.innerHTML = "";
  samples.forEach((p) => {
    const img = document.createElement("img");
    img.src = BACKEND + p;
    img.className = "w-full h-48 object-cover rounded border border-white/10 hover:scale-105 transition-transform duration-300 cursor-pointer";
    img.onclick = () => window.open(img.src, "_blank");
    snapshotContainer.appendChild(img);
  });
}

// ----------------------------
// HIGHLIGHT LEVEL
// ----------------------------
function highlightLevel(rds) {
  let idx = LEVELS.findIndex((lv) => rds >= lv.range[0] && rds < lv.range[1]);
  if (rds === 100) idx = LEVELS.length - 1;
  if (idx < 0) idx = 0;
  
  [...levelsEl.children].forEach((el) => {
    el.style.opacity = "0.3";
    el.className = "p-2 rounded border border-transparent opacity-30 text-sm text-gray-500 text-center transition-all";
  });
  
  const active = levelsEl.children[idx];
  active.style.opacity = "1";
  // Add dynamic coloring class based on score roughly
  let colorClass = "border-white bg-white/10 text-white scale-110 shadow-lg";
  if(rds < 40) colorClass = "border-red-500 bg-red-500/20 text-white scale-110 shadow-lg";
  else if(rds < 70) colorClass = "border-yellow-500 bg-yellow-500/20 text-white scale-110 shadow-lg";
  else colorClass = "border-green-500 bg-green-500/20 text-white scale-110 shadow-lg";

  active.className = `p-2 rounded text-sm text-center transition-all ${colorClass}`;
}
