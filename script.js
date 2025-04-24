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

    // Get input values
    const targetFile = document.getElementById("targetInput").files[0];
    const sourceFile = document.getElementById("sourceInput").files[0];
    const anon = parseInt(document.getElementById("anonInput").value);
    const adv = parseInt(document.getElementById("advInput").value);

    // Validate inputs
    if (!targetFile || !sourceFile) throw new Error("Please upload both images!");
    if (isNaN(anon) || anon < 0 || anon > 100 || 
        isNaN(adv) || adv < 0 || adv > 100) {
      throw new Error("Please enter valid values (0-100) for ratios!");
    }

    // Show loading state
    swapBtn.disabled = true;
    loading.style.display = "block";
    queueStatus.innerHTML = "Connecting to API...";

    // Create Blobs with proper MIME types
    const targetBlob = new Blob([targetFile], { type: targetFile.type });
    const sourceBlob = new Blob([sourceFile], { type: sourceFile.type });

    // Make API call with progress handling
    const result = await app.predict("/run_inference", [
      targetBlob,
      sourceBlob,
      anon,
      adv,
      ["Compare"]
    ], {
      onProgress: (progress) => {
        console.log("API Progress:", progress);
        handleProgressUpdate(progress);
      },
      signal: currentController.signal
    });

    // Handle final response
    if (result?.data?.error) {
      throw new Error(result.data.error || "Unknown error occurred");
    }

    handleImageResponse(result.data);

  } catch (error) {
    handleError(error);
  } finally {
    swapBtn.disabled = false;
    loading.style.display = "none";
  }
}

function handleProgressUpdate(progress) {
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
  if (!data) throw new Error("No image data received");
  
  // Handle different response formats
  const imageData = data.startsWith("data:image") ? data : 
                   typeof data === "string" ? `data:image/png;base64,${data}` : 
                   URL.createObjectURL(new Blob([data], { type: "image/png" }));

  resultImg.onload = () => {
    resultSection.style.display = "block";
    URL.revokeObjectURL(imageData); // Clean up if using object URL
  };
  resultImg.src = imageData;
}

function handleError(error) {
  console.error("Error:", error);
  errorMsg.textContent = error.message.replace("Error: ", "");
  errorMsg.style.display = "block";
  
  if (error.message.includes("aborted")) return;
  if (error.message.includes("queue")) {
    errorMsg.textContent += " - Please try again in a few moments";
  }
}

// Event Listeners
swapBtn.addEventListener("click", handleFaceSwap);

document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener("input", (e) => {
    let value = parseInt(e.target.value);
    if (value < 0) e.target.value = 0;
    if (value > 100) e.target.value = 100;
  });
});

// Cancel ongoing request if page is hidden
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    currentController?.abort();
  }
});
