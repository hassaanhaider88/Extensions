const jsonInput = document.getElementById("jsonInput");
const formatBtn = document.getElementById("formatBtn");
const jsonOutput = document.getElementById("jsonOutput");

formatBtn.addEventListener("click", () => {
  let json;
  try {
    json = JSON.parse(jsonInput.value);
  } catch (e) {
    alert("Invalid JSON!");
    return;
  }
  jsonOutput.innerHTML = "";
  renderJSON(json, jsonOutput);
});

function renderJSON(json, container) {
  if (Array.isArray(json)) {
    json.forEach((obj, idx) => {
      const objDiv = createObjectDiv(obj, idx + 1);
      container.appendChild(objDiv);
    });
  } else if (typeof json === "object") {
    const objDiv = createObjectDiv(json, 1);
    container.appendChild(objDiv);
  }
}

function createObjectDiv(obj, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "json-object";

  const header = document.createElement("div");
  header.innerHTML = `<span class="toggle-btn">[–]</span> ${index}: {`;
  wrapper.appendChild(header);

  const inner = document.createElement("div");
  inner.style.marginLeft = "15px";

  Object.entries(obj).forEach(([key, value]) => {
    const line = document.createElement("div");
    line.className = "json-line";
    const valueStr = typeof value === "object" ? JSON.stringify(value) : value;
    line.innerHTML = `<span>${key}: "${valueStr}"</span>`;
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerText = "Copy";
    copyBtn.onclick = () => navigator.clipboard.writeText(valueStr);
    line.appendChild(copyBtn);
    inner.appendChild(line);
  });

  wrapper.appendChild(inner);

  const footer = document.createElement("div");
  footer.innerText = "}";
  wrapper.appendChild(footer);

  // Toggle functionality
  const toggleBtn = header.querySelector(".toggle-btn");
  toggleBtn.addEventListener("click", () => {
    if (inner.style.display === "none") {
      inner.style.display = "block";
      toggleBtn.innerText = "[–]";
    } else {
      inner.style.display = "none";
      toggleBtn.innerText = "[+]";
    }
  });

  return wrapper;
}
