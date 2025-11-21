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
const videoTooLongModal = document.getElementById("videoTooLongModal");
const videoDurationText = document.getElementById("videoDurationText");
const closeErrorModal = document.getElementById("closeErrorModal");
const cancelBtn = document.getElementById("cancelBtn");

let selectedFile = null;
let progressInterval = null;
let currentVideoDuration = 0;
let currentSessionId = null;
let queuePollInterval = null;

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ----------------------------
//  ROAD SCORE LEVEL SYSTEM
// ----------------------------
const LEVELS = [
  { range: [0, 10], label: "Extremely Poor" },
  { range: [10, 20], label: "Very Poor" },
  { range: [20, 30], label: "Poor" },
  { range: [30, 40], label: "Below Average" },
  { range: [40, 50], label: "Fair" },
  { range: [50, 60], label: "Acceptable" },
  { range: [60, 70], label: "Good" },
  { range: [70, 80], label: "Very Good" },
  { range: [80, 90], label: "Excellent" },
  { range: [90, 100], label: "Pristine" },
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
  currentSessionId = null; // Reset session ID for new file

  previewContainer.classList.remove("hidden");
  resultBox.classList.add("hidden");
  snapshotSection.classList.add("hidden");
  cancelBtn.classList.add("hidden"); // Hide cancel button for new file

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
  currentSessionId = null;

  // Clear queue polling
  if (queuePollInterval) {
    clearInterval(queuePollInterval);
    queuePollInterval = null;
  }

  previewContainer.classList.add("hidden");
  resultBox.classList.add("hidden");
  cancelBtn.classList.add("hidden");
  longVideoWarning.classList.add("hidden"); // Hide warning
  imageInput.removeAttribute("capture");
  imageInput.value = "";
  videoInput.value = "";
  longVideoModal.classList.add("hidden");
  videoTooLongModal.classList.add("hidden");
  analyseBtn.textContent = "RUN ANALYSIS";
});

// Close error modal
closeErrorModal.addEventListener("click", () => {
  videoTooLongModal.classList.add("hidden");
});

// ----------------------------
// EXPLANATION MODAL
// ----------------------------
const explainBtn = document.getElementById("explainBtn");
const explanationModal = document.getElementById("explanationModal");
const closeExplanationModal = document.getElementById("closeExplanationModal");
const closeExplanationBtn = document.getElementById("closeExplanationBtn");

if (explainBtn) {
  explainBtn.addEventListener("click", () => {
    explanationModal.classList.remove("hidden");
  });
}

if (closeExplanationModal) {
  closeExplanationModal.addEventListener("click", () => {
    explanationModal.classList.add("hidden");
  });
}

if (closeExplanationBtn) {
  closeExplanationBtn.addEventListener("click", () => {
    explanationModal.classList.add("hidden");
  });
}

// Close modal when clicking outside
explanationModal.addEventListener("click", (e) => {
  if (e.target === explanationModal) {
    explanationModal.classList.add("hidden");
  }
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

  // CHECK IF VIDEO IS TOO LONG (> 60 seconds)
  if (selectedFile.type.startsWith("video") && currentVideoDuration > 60) {
    const minutes = Math.floor(currentVideoDuration / 60);
    const seconds = Math.floor(currentVideoDuration % 60);
    videoDurationText.textContent = `${minutes}m ${seconds}s`;
    videoTooLongModal.classList.remove("hidden");
    return; // Don't proceed with analysis
  }

  // CHECK FOR LONG VIDEO (30-60 seconds) - show inline warning
  if (selectedFile.type.startsWith("video") && currentVideoDuration > 30) {
    longVideoWarning.classList.remove("hidden");
  }

  analyseBtn.disabled = true;
  analyseBtn.textContent = "JOINING QUEUE...";

  // Generate session ID for video analysis BEFORE starting
  if (selectedFile.type.startsWith("video")) {
    currentSessionId = generateUUID();
    console.log("Generated session ID:", currentSessionId);

    // Join queue first
    try {
      const queueRes = await fetch(BACKEND + `/queue/join?session_id=${encodeURIComponent(currentSessionId)}`, {
        method: "POST"
      });
      const queueData = await queueRes.json();

      console.log("Queue status:", queueData);

      // Start polling queue status
      await pollQueueStatus();

    } catch (err) {
      console.error("Queue join error:", err);
      alert("Failed to join queue. Please try again.");
      analyseBtn.disabled = false;
      analyseBtn.textContent = "RUN ANALYSIS";
      return;
    }
  } else {
    // Image analysis - no queue needed
    await runAnalysis();
  }
});

// ----------------------------
// QUEUE POLLING
// ----------------------------
async function pollQueueStatus() {
  return new Promise((resolve) => {
    queuePollInterval = setInterval(async () => {
      try {
        const statusRes = await fetch(BACKEND + `/queue/status/${currentSessionId}`);
        const statusData = await statusRes.json();

        console.log("Queue update:", statusData);

        if (statusData.status === 'queued') {
          // Show queue position
          analyseBtn.textContent = `IN QUEUE: ${statusData.position}/${statusData.total}`;
          cancelBtn.classList.remove("hidden");
        } else if (statusData.status === 'processing') {
          // Start analysis
          clearInterval(queuePollInterval);
          queuePollInterval = null;
          analyseBtn.textContent = "ANALYSING...";
          resolve();
          await runAnalysis();
        } else if (statusData.status === 'not_found') {
          // Need to join queue
          clearInterval(queuePollInterval);
          queuePollInterval = null;
          resolve();
          await runAnalysis();
        }
      } catch (err) {
        console.error("Queue poll error:", err);
      }
    }, 2000); // Poll every 2 seconds
  });
}

// ----------------------------
// RUN ANALYSIS
// ----------------------------
async function runAnalysis() {
  analyseBtn.textContent = "ANALYSING...";

  // Show cancel button for video analysis
  if (selectedFile.type.startsWith("video")) {
    cancelBtn.classList.remove("hidden");
    if (currentVideoDuration > 30) {
      longVideoWarning.classList.remove("hidden");
    }
  }

  resultBox.classList.remove("hidden");
  rdsDisplay.innerHTML = "...";
  valuesText.innerHTML = "";
  snapshotSection.classList.add("hidden");

  showProgress();

  const fd = new FormData();
  fd.append("file", selectedFile);

  try {
    let endpoint = selectedFile.type.startsWith("image") ? "/analyze/image" : "/analyze/video";

    // For video analysis, pass the session_id as a query parameter
    if (selectedFile.type.startsWith("video") && currentSessionId) {
      endpoint += `?session_id=${encodeURIComponent(currentSessionId)}`;
    }

    const res = await fetch(BACKEND + endpoint, { method: "POST", body: fd });
    const data = await res.json();

    stopProgress();
    analyseBtn.disabled = false;
    analyseBtn.textContent = "ANALYSIS COMPLETE";
    cancelBtn.classList.add("hidden"); // Hide cancel button
    longVideoWarning.classList.add("hidden"); // Hide warning when done
    longVideoModal.classList.add("hidden"); // Hide modal when done

    const s = data.summary || data.details || {};
    const rds = Number(s.RDS || s.avg_RDS || 0);

    // Check if analysis was cancelled
    if (s.cancelled) {
      rdsDisplay.innerHTML = "<span class='text-red-400'>Cancelled</span>";
      valuesText.innerHTML = `
        <div class="col-span-full bg-red-500/10 p-6 rounded-lg border border-red-500/30 text-center">
          <p class="text-red-400 font-bold text-lg">Analysis was cancelled</p>
          <p class="text-gray-400 text-sm mt-2">Partial results from ${data.frames || 0} frames processed</p>
        </div>
      `;
      return; // Don't show normal results
    }

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
    cancelBtn.classList.add("hidden");
    longVideoWarning.classList.add("hidden");
    longVideoModal.classList.add("hidden");
    console.error(err);
    alert("Error analysing file. Ensure backend is running.");
    analyseBtn.textContent = "RETRY";
    analyseBtn.disabled = false;
  }
}

// ----------------------------
// CANCEL ANALYSIS
// ----------------------------
cancelBtn.addEventListener("click", async () => {
  if (!currentSessionId) {
    console.warn("No active session to cancel");
    return;
  }

  console.log("Cancelling session:", currentSessionId);

  try {
    const res = await fetch(BACKEND + `/cancel/${currentSessionId}`, { method: "POST" });
    const data = await res.json();

    console.log("Cancel response:", data);

    if (data.status === "cancelled") {
      console.log("Cancellation request sent successfully");
      // UI will update when the backend returns the cancelled response
      cancelBtn.disabled = true;
      cancelBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        CANCELLING...
      `;
    }
  } catch (err) {
    console.error("Failed to cancel analysis:", err);
    alert("Failed to cancel analysis. Please try again.");
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
  if (rds < 40) colorClass = "border-red-500 bg-red-500/20 text-white scale-110 shadow-lg";
  else if (rds < 70) colorClass = "border-yellow-500 bg-yellow-500/20 text-white scale-110 shadow-lg";
  else colorClass = "border-green-500 bg-green-500/20 text-white scale-110 shadow-lg";

  active.className = `p-2 rounded text-sm text-center transition-all ${colorClass}`;
}
