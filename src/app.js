import { HandLandmarker, FilesetResolver } from "https:


const video = document.getElementById('webcam');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const loadingSpinner = document.getElementById('loading-spinner');
const cameraInactiveOverlay = document.getElementById('camera-inactive-overlay');
const peaceHud = document.getElementById('peace-hud');
const fpsCounter = document.getElementById('fps-counter');
const handsDetected = document.getElementById('hands-detected');
const screenBlurOverlay = document.getElementById('screen-blur-overlay');
const controlPanel = document.querySelector('.control-panel');


const cameraSelect = document.getElementById('camera-select');
const blurAmountSlider = document.getElementById('blur-amount');
const blurAmountVal = document.getElementById('blur-amount-val');
const confidenceSlider = document.getElementById('detection-confidence');
const confidenceVal = document.getElementById('confidence-val');
const toggleCameraBtn = document.getElementById('toggle-camera-btn');
const snapshotBtn = document.getElementById('snapshot-btn');
const toggleFlipBtn = document.getElementById('toggle-flip-btn');
const overlayStartCamera = document.getElementById('overlay-start-camera');


const blurModeScreenCheckbox = document.getElementById('blur-mode-screen');
const showLandmarksCheckbox = document.getElementById('show-landmarks');
const hideUiInBlurCheckbox = document.getElementById('hide-ui-in-blur');


let handLandmarker = null;
let currentStream = null;
let activeCameraId = '';
let isModelLoaded = false;
let isCameraActive = false;
let mirrorView = true;
let blurStrength = parseInt(blurAmountSlider.value);
let confidenceThreshold = parseFloat(confidenceSlider.value) / 100;
let blurScreenMode = false;
let showLandmarks = true;
let hideUiInBlur = false;

let lastVideoTime = -1;
let isPeaceDetected = false;
let frameCount = 0;
let lastFpsUpdate = 0;
let fps = 0;
let lastDetections = null; 


const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], 
  [5, 6], [6, 7], [7, 8],          
  [9, 10], [10, 11], [11, 12],     
  [13, 14], [14, 15], [15, 16],    
  [17, 18], [18, 19], [19, 20],    
  [0, 5], [5, 9], [9, 13], [13, 17], [0, 17] 
];


async function init() {
  loadSavedSettings();
  updateCssVariables();
  
  try {
    
    setStatus('warning', 'Loading AI Model...');
    const vision = await FilesetResolver.forVisionTasks(
      "https:
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https:
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: confidenceThreshold,
      minHandPresenceConfidence: confidenceThreshold,
      minTrackingConfidence: confidenceThreshold
    });
    
    isModelLoaded = true;
    setStatus('active', 'AI Model Ready');
    loadingSpinner.classList.add('hidden');
    
    
    await setupCameraDevices();
    await startCamera();
    
    
    requestAnimationFrame(renderLoop);
    
  } catch (err) {
    console.error("Initialization error:", err);
    setStatus('danger', 'Error initializing');
    alert("Could not load camera or AI engine. Please verify webcam access permission.");
    loadingSpinner.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--danger);"></i>
      <p style="margin-top: 1rem; color: var(--danger);">Failed to load camera/AI: ${err.message}</p>
    `;
  }
  
  setupEventListeners();
}


function loadSavedSettings() {
  if (localStorage.getItem('blurStrength')) {
    blurStrength = parseInt(localStorage.getItem('blurStrength'));
    blurAmountSlider.value = blurStrength;
    blurAmountVal.textContent = `${blurStrength}px`;
  }
  if (localStorage.getItem('confidenceThreshold')) {
    confidenceThreshold = parseFloat(localStorage.getItem('confidenceThreshold'));
    confidenceSlider.value = Math.round(confidenceThreshold * 100);
    confidenceVal.textContent = `${Math.round(confidenceThreshold * 100)}%`;
  }
  if (localStorage.getItem('mirrorView')) {
    mirrorView = localStorage.getItem('mirrorView') === 'true';
    if (!mirrorView) {
      canvas.classList.add('no-mirror');
      toggleFlipBtn.classList.add('active');
    }
  }
  if (localStorage.getItem('blurScreenMode')) {
    blurScreenMode = localStorage.getItem('blurScreenMode') === 'true';
    blurModeScreenCheckbox.checked = blurScreenMode;
  }
  if (localStorage.getItem('showLandmarks')) {
    showLandmarks = localStorage.getItem('showLandmarks') === 'true';
    showLandmarksCheckbox.checked = showLandmarks;
  }
  if (localStorage.getItem('hideUiInBlur')) {
    hideUiInBlur = localStorage.getItem('hideUiInBlur') === 'true';
    hideUiInBlurCheckbox.checked = hideUiInBlur;
  }
}

function updateCssVariables() {
  document.documentElement.style.setProperty('--blur-strength', `${blurStrength}px`);
}


function setStatus(type, message) {
  statusDot.className = 'status-dot ' + type;
  statusText.textContent = message;
}


async function setupCameraDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    cameraSelect.innerHTML = '';
    
    if (videoDevices.length === 0) {
      cameraSelect.innerHTML = '<option value="">No camera detected</option>';
      return;
    }
    
    videoDevices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Camera ${cameraSelect.length + 1}`;
      cameraSelect.appendChild(option);
    });
    
    activeCameraId = videoDevices[0].deviceId;
    cameraSelect.value = activeCameraId;
  } catch (err) {
    console.error("Error enumerating devices:", err);
  }
}

async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  
  const constraints = {
    video: {
      deviceId: activeCameraId ? { exact: activeCameraId } : undefined,
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  };
  
  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
    
    
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
    
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    isCameraActive = true;
    cameraInactiveOverlay.classList.add('hidden');
    toggleCameraBtn.classList.remove('active');
    toggleCameraBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
    
    if (isModelLoaded) {
      setStatus('active', 'Camera Active');
    }
  } catch (err) {
    console.error("Error starting camera:", err);
    setStatus('danger', 'Camera Error');
    isCameraActive = false;
    cameraInactiveOverlay.classList.remove('hidden');
    toggleCameraBtn.classList.add('active');
    toggleCameraBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
  }
}

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  isCameraActive = false;
  cameraInactiveOverlay.classList.remove('hidden');
  toggleCameraBtn.classList.add('active');
  toggleCameraBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
  
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (isModelLoaded) {
    setStatus('warning', 'Camera Inactive');
  }
}


function checkPeaceGesture(landmarks) {
  
  const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
  
  const wrist = landmarks[0];
  
  
  
  const distIndexTip = dist(landmarks[8], wrist);
  const distIndexPip = dist(landmarks[6], wrist);
  const distIndexMcp = dist(landmarks[5], wrist);
  
  
  const distMiddleTip = dist(landmarks[12], wrist);
  const distMiddlePip = dist(landmarks[10], wrist);
  const distMiddleMcp = dist(landmarks[9], wrist);
  
  
  const distRingTip = dist(landmarks[16], wrist);
  const distRingPip = dist(landmarks[14], wrist);
  const distRingMcp = dist(landmarks[13], wrist);
  
  
  const distPinkyTip = dist(landmarks[20], wrist);
  const distPinkyPip = dist(landmarks[18], wrist);
  const distPinkyMcp = dist(landmarks[17], wrist);

  
  
  const isIndexExtended = distIndexTip > distIndexPip && distIndexTip > distIndexMcp;
  const isMiddleExtended = distMiddleTip > distMiddlePip && distMiddleTip > distMiddleMcp;
  
  
  const isRingFolded = distRingTip < distRingPip || distRingTip < distRingMcp;
  const isPinkyFolded = distPinkyTip < distPinkyPip || distPinkyTip < distPinkyMcp;
  
  
  const tipDist = dist(landmarks[8], landmarks[12]);
  const baseDist = dist(landmarks[5], landmarks[9]);
  const isSpread = tipDist > baseDist * 1.25;

  return isIndexExtended && isMiddleExtended && isRingFolded && isPinkyFolded && isSpread;
}


function drawHandSkeleton(ctx, landmarks, isPeace) {
  
  const jointColor = isPeace ? '
  const jointCenterColor = '
  const connectionColor = isPeace ? 'rgba(239, 68, 68, 0.45)' : 'rgba(20, 184, 166, 0.45)';
  const glowColor = isPeace ? '

  
  ctx.strokeStyle = connectionColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.shadowColor = glowColor;
  
  HAND_CONNECTIONS.forEach(([start, end]) => {
    const pt1 = landmarks[start];
    const pt2 = landmarks[end];
    
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(pt1.x * canvas.width, pt1.y * canvas.height);
    ctx.lineTo(pt2.x * canvas.width, pt2.y * canvas.height);
    ctx.stroke();
  });
  
  
  ctx.shadowBlur = 0;

  
  landmarks.forEach((pt, index) => {
    const x = pt.x * canvas.width;
    const y = pt.y * canvas.height;
    
    
    ctx.fillStyle = jointColor;
    ctx.beginPath();
    ctx.arc(x, y, index === 8 || index === 12 ? 8 : 5, 0, 2 * Math.PI);
    ctx.fill();
    
    
    ctx.fillStyle = jointCenterColor;
    ctx.beginPath();
    ctx.arc(x, y, index === 8 || index === 12 ? 3 : 2, 0, 2 * Math.PI);
    ctx.fill();
  });
}


function drawLandmarksOnContext(snapshotCtx, detections, width, height) {
  if (!detections || !detections.landmarks) return;
  
  snapshotCtx.save();
  
  detections.landmarks.forEach(handLandmarks => {
    
    snapshotCtx.strokeStyle = isPeaceDetected ? 'rgba(239, 68, 68, 0.5)' : 'rgba(20, 184, 166, 0.5)';
    snapshotCtx.lineWidth = 4;
    snapshotCtx.lineCap = 'round';
    
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const pt1 = handLandmarks[start];
      const pt2 = handLandmarks[end];
      snapshotCtx.beginPath();
      snapshotCtx.moveTo(pt1.x * width, pt1.y * height);
      snapshotCtx.lineTo(pt2.x * width, pt2.y * height);
      snapshotCtx.stroke();
    });

    
    handLandmarks.forEach((pt, index) => {
      const x = pt.x * width;
      const y = pt.y * height;
      snapshotCtx.fillStyle = isPeaceDetected ? '
      snapshotCtx.beginPath();
      snapshotCtx.arc(x, y, index === 8 || index === 12 ? 8 : 5, 0, 2 * Math.PI);
      snapshotCtx.fill();
      
      snapshotCtx.fillStyle = '
      snapshotCtx.beginPath();
      snapshotCtx.arc(x, y, index === 8 || index === 12 ? 3 : 2, 0, 2 * Math.PI);
      snapshotCtx.fill();
    });
  });
  snapshotCtx.restore();
}


function renderLoop(timestamp) {
  if (!isCameraActive || !handLandmarker) {
    requestAnimationFrame(renderLoop);
    return;
  }

  
  frameCount++;
  if (timestamp - lastFpsUpdate >= 1000) {
    fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
    fpsCounter.textContent = fps;
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }

  
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    
    const startTimeMs = performance.now();
    const detections = handLandmarker.detectForVideo(video, startTimeMs);
    lastDetections = detections;
    
    
    let peaceDetectedInFrame = false;
    const numDetectedHands = detections.landmarks ? detections.landmarks.length : 0;
    handsDetected.textContent = numDetectedHands;

    if (numDetectedHands > 0) {
      for (const handLandmarks of detections.landmarks) {
        if (checkPeaceGesture(handLandmarks)) {
          peaceDetectedInFrame = true;
          break;
        }
      }
    }

    
    if (peaceDetectedInFrame !== isPeaceDetected) {
      isPeaceDetected = peaceDetectedInFrame;
      updateBlurUIState();
    }

    
    if (showLandmarks && numDetectedHands > 0) {
      detections.landmarks.forEach(handLandmarks => {
        drawHandSkeleton(ctx, handLandmarks, isPeaceDetected);
      });
    }
  }

  requestAnimationFrame(renderLoop);
}


function updateBlurUIState() {
  if (isPeaceDetected) {
    
    peaceHud.classList.add('active');
    
    if (blurScreenMode) {
      screenBlurOverlay.classList.add('active');
      canvas.classList.remove('blurred'); 
    } else {
      canvas.classList.add('blurred');
      screenBlurOverlay.classList.remove('active');
    }

    if (hideUiInBlur) {
      controlPanel.classList.add('fade-out');
    }
  } else {
    
    peaceHud.classList.remove('active');
    canvas.classList.remove('blurred');
    screenBlurOverlay.classList.remove('active');
    controlPanel.classList.remove('fade-out');
  }
}


function takeSnapshot() {
  if (!isCameraActive) return;
  
  const snapCanvas = document.createElement('canvas');
  snapCanvas.width = video.videoWidth;
  snapCanvas.height = video.videoHeight;
  const snapCtx = snapCanvas.getContext('2d');
  
  snapCtx.save();
  
  
  if (mirrorView) {
    snapCtx.translate(snapCanvas.width, 0);
    snapCtx.scale(-1, 1);
  }
  
  
  if (isPeaceDetected) {
    
    snapCtx.filter = `blur(${blurStrength}px)`;
    snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
    snapCtx.filter = 'none';
  } else {
    
    snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
  }
  
  
  snapCtx.restore();
  
  
  if (showLandmarks && lastDetections && lastDetections.landmarks.length > 0) {
    
    
    
    
    snapCtx.save();
    if (mirrorView) {
      snapCtx.translate(snapCanvas.width, 0);
      snapCtx.scale(-1, 1);
    }
    drawLandmarksOnContext(snapCtx, lastDetections, snapCanvas.width, snapCanvas.height);
    snapCtx.restore();
  }
  
  
  const dateStr = new Date().toISOString().slice(0, 19).replace(/T/, '_').replace(/:/g, '-');
  const link = document.createElement('a');
  link.download = `AuraCam_${dateStr}.png`;
  link.href = snapCanvas.toDataURL('image/png');
  link.click();
}


function setupEventListeners() {
  
  toggleCameraBtn.addEventListener('click', () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  });

  
  overlayStartCamera.addEventListener('click', startCamera);

  
  snapshotBtn.addEventListener('click', takeSnapshot);

  
  toggleFlipBtn.addEventListener('click', () => {
    mirrorView = !mirrorView;
    localStorage.setItem('mirrorView', mirrorView);
    
    if (mirrorView) {
      canvas.classList.remove('no-mirror');
      toggleFlipBtn.classList.remove('active');
    } else {
      canvas.classList.add('no-mirror');
      toggleFlipBtn.classList.add('active');
    }
  });

  
  cameraSelect.addEventListener('change', (e) => {
    activeCameraId = e.target.value;
    if (isCameraActive) {
      startCamera();
    }
  });

  
  blurAmountSlider.addEventListener('input', (e) => {
    blurStrength = parseInt(e.target.value);
    blurAmountVal.textContent = `${blurStrength}px`;
    updateCssVariables();
    localStorage.setItem('blurStrength', blurStrength);
  });

  
  confidenceSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    confidenceThreshold = val / 100;
    confidenceVal.textContent = `${val}%`;
    localStorage.setItem('confidenceThreshold', confidenceThreshold);
    
    
    if (handLandmarker) {
      handLandmarker.setOptions({
        minHandDetectionConfidence: confidenceThreshold,
        minHandPresenceConfidence: confidenceThreshold,
        minTrackingConfidence: confidenceThreshold
      });
    }
  });

  
  blurModeScreenCheckbox.addEventListener('change', (e) => {
    blurScreenMode = e.target.checked;
    localStorage.setItem('blurScreenMode', blurScreenMode);
    updateBlurUIState();
  });

  
  showLandmarksCheckbox.addEventListener('change', (e) => {
    showLandmarks = e.target.checked;
    localStorage.setItem('showLandmarks', showLandmarks);
  });

  
  hideUiInBlurCheckbox.addEventListener('change', (e) => {
    hideUiInBlur = e.target.checked;
    localStorage.setItem('hideUiInBlur', hideUiInBlur);
    updateBlurUIState();
  });

  
  window.addEventListener('resize', () => {
    if (video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
  });
}


init();
