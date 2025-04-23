import { Client } from "https://esm.sh/@gradio/client";

document.getElementById("swapBtn").addEventListener("click", async () => {
  const targetFile = document.getElementById("targetInput").files[0];
  const sourceFile = document.getElementById("sourceInput").files[0];
  const anon = parseInt(document.getElementById("anonInput").value);
  const adv = parseInt(document.getElementById("advInput").value);

  if (!targetFile || !sourceFile) {
    alert("Please upload both images!");
    return;
  }

  const app = await Client.connect("felixrosberg/face-swap");

  const result = await app.predict("/run_inference", [
    targetFile,
    sourceFile,
    anon,
    adv,
    ["Compare"]
  ]);

  const resultImg = document.getElementById("resultImg");
  resultImg.src = result.data[0];
  resultImg.style.display = "block";
});
