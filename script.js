import { Client } from "https://esm.sh/@gradio/client";

const app = await Client.connect("felixrosberg/face-swap");
const swapBtn = document.getElementById("swapBtn");
const loading = document.getElementById("loading");
const resultSection = document.getElementById("resultSection");
const resultImg = document.getElementById("resultImg");
const errorMsg = document.getElementById("errorMsg");
const queueStatus = document.getElementById("queueStatus");

let currentController = null;

async function handleFaceSwap() {
  try {
    // Reset state
    errorMsg.style.display = "none";
    resultSection.style.display = "none";
    currentController?.abort();
    currentController = new AbortController();

    // Get and validate inputs
    const targetFile = document.getElementById("targetInput").files[0];
    const sourceFile = document.getElementById("sourceInput").files[0];
    const anon = parseInt(document.getElementById("anonInput").value);
    const adv = parseInt(document.getElementById("advInput").value);

    if (!targetFile || !sourceFile) throw new Error("Please upload both images!");
    if ([anon, adv].some(v => isNaN(v) || v < 0 || v > 100)) {
      throw new Error("Please enter valid values (0-100) for ratios!");
    }

    // Show loading state
    swapBtn.disabled = true;
    loading.style.display = "block";
    queueStatus.innerHTML = "Connecting to API...";

    // Prepare files
    const targetBlob = new Blob([targetFile], { type: targetFile.type });
    const sourceBlob = new Blob([sourceFile], { type: sourceFile.type });

    // Make API call
    const result = await app.predict("/run_inference", [
      targetBlob,
      sourceBlob,
      anon,
      adv,
      ["Compare"]
    ], {
      onProgress: handleProgressUpdate,
      signal: currentController.signal
    });

    // Handle API response
    if (!result || typeof result !== "object") {
      throw new Error("Invalid API response format");
    }

    // Check for API errors
    if (result?.data?.error) {
      throw new Error(result.data.error);
    }

    // Validate and process image data
    if (typeof result.data === "string") {
      handleImageResponse(result.data);
    } else if (result.data?.data) {
      handleImageResponse(result.data.data);
    } else {
      console.error("Unexpected response structure:", result);
      throw new Error("Failed to process images - unexpected response format");
    }

  } catch (error) {
    handleError(error);
  } finally {
    swapBtn.disabled = false;
    loading.style.display = "none";
  }
}

function handleProgressUpdate(progress) {
  if (!progress) return;
  
  switch (progress.msg) {
    case "estimation":
      queueStatus.innerHTML = `
        Queue position: ${progress.queue_size + 1}<br>
        Estimated wait time: ${Math.round(progress.rank_eta)}s
      `;
      break;
    case "process_starts":
      queueStatus.innerHTML = `Processing started (ETA: ${Math.round(progress.eta)}s)`;
      break;
    case "process_completed":
      if (!progress.success) {
        throw new Error(progress.output?.error || "Processing failed");
      }
      break;
  }
}

function handleImageResponse(data) {
  if (!data) {
    throw new Error("Received empty image data");
  }

  let imageData;
  
  if (typeof data === "string") {
    // Handle base64 string
    imageData = data.startsWith("data:image") ? data : 
               `data:image/png;base64,${data}`;
  } else if (data instanceof Blob) {
    // Handle Blob response
    imageData = URL.createObjectURL(data);
  } else {
    console.error("Unexpected image data type:", typeof data);
    throw new Error("Unsupported image format received");
  }

  resultImg.onload = () => {
    resultSection.style.display = "block";
    if (imageData.startsWith("blob:")) {
      URL.revokeObjectURL(imageData);
    }
  };
  
  resultImg.onerror = () => {
    throw new Error("Failed to load result image");
  };

  resultImg.src = imageData;
}

function handleError(error) {
  console.error("Error:", error);
  errorMsg.textContent = error.message.replace("Error: ", "");
  
  // Handle specific error cases
  if (error.message.includes("aborted")) {
    errorMsg.textContent = "Request canceled";
  }
  else if (error.message.includes("queue")) {
    errorMsg.textContent += " - Server busy, please try again later";
  }
  else if (error.message.includes("face")) {
    errorMsg.textContent += " - Could not detect faces in images";
  }
  
  errorMsg.style.display = "block";
}

// Event listeners (same as previous version)
swapBtn.addEventListener("click", handleFaceSwap);
document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener("input", (e) => {
    let value = parseInt(e.target.value);
    if (value < 0) e.target.value = 0;
    if (value > 100) e.target.value = 100;
  });
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    currentController?.abort();
  }
});
