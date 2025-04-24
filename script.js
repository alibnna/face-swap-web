import { Client } from "https://esm.sh/@gradio/client";

// Initialize UI elements
const swapBtn = document.getElementById("swapBtn");
const loading = document.getElementById("loading");
const resultSection = document.getElementById("resultSection");
const resultImg = document.getElementById("resultImg");

// Convert File to Base64
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

// Handle API call
async function handleFaceSwap() {
  try {
    // Validate inputs
    const targetFile = document.getElementById("targetInput").files[0];
    const sourceFile = document.getElementById("sourceInput").files[0];
    const anon = parseInt(document.getElementById("anonInput").value);
    const adv = parseInt(document.getElementById("advInput").value);

    if (!targetFile || !sourceFile) {
      throw new Error("Please upload both images!");
    }

    if (isNaN(anon) || anon < 0 || anon > 100 || 
        isNaN(adv) || adv < 0 || adv > 100) {
      throw new Error("Please enter valid values (0-100) for ratios!");
    }

    // Show loading state
    swapBtn.disabled = true;
    loading.style.display = "block";
    resultSection.style.display = "none";

    // Convert files to Base64
    const [targetBase64, sourceBase64] = await Promise.all([
      fileToBase64(targetFile),
      fileToBase64(sourceFile)
    ]);

    // Connect to Gradio API
    const app = await Client.connect("felixrosberg/face-swap");
    
    // Make prediction
    const result = await app.predict("/run_inference", [
      { data: targetBase64, name: "target.png" },
      { data: sourceBase64, name: "source.png" },
      anon,
      adv,
      ["Compare"]
    ]);

    // Handle response
    if (!result?.data) {
      throw new Error("No response data from API");
    }

    const imageData = result.data;
    console.log("Received image data:", imageData);

    if (typeof imageData === "string" && imageData.startsWith("data:image")) {
      resultImg.src = imageData;
      resultSection.style.display = "block";
    } else {
      throw new Error("Invalid image format received from API");
    }
  } catch (error) {
    console.error("Face swap error:", error);
    alert(`Error: ${error.message}`);
  } finally {
    // Reset UI state
    swapBtn.disabled = false;
    loading.style.display = "none";
  }
}

// Event listeners
document.getElementById("swapBtn").addEventListener("click", handleFaceSwap);

// Input validation for number fields
document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener("input", (e) => {
    let value = parseInt(e.target.value);
    if (value < 0) e.target.value = 0;
    if (value > 100) e.target.value = 100;
  });
});
