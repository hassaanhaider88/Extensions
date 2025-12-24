// Auto-detect JSON
function isJSON(text) {
  try {
    const obj = JSON.parse(text);
    return obj;
  } catch (e) {
    return false;
  }
}

function beautifyJSON(obj, container) {
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      container.appendChild(createObjectDiv(item, idx + 1));
    });
  } else if (typeof obj === "object") {
    container.appendChild(createObjectDiv(obj, 1));
  }
}

function createObjectDiv(obj, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "json-object";

  const header = document.createElement("div");
  header.innerHTML = `<span class="toggle-btn">▶</span> ${index}: {`;
  wrapper.appendChild(header);

  const inner = document.createElement("div");
  inner.style.marginLeft = "15px";

  Object.entries(obj).forEach(([key, value]) => {
    const line = document.createElement("div");
    line.className = "json-line";
    const valueStr = typeof value === "object" ? JSON.stringify(value, null, 2) : value;
    line.innerHTML = `<span>${key}: "${valueStr}"</span>`;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerText = "Copy";

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(valueStr);
      copyBtn.classList.add("copied");
      copyBtn.innerText = "Copied!";
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.innerText = "Copy";
      }, 2000);
    };

    line.appendChild(copyBtn);
    inner.appendChild(line);
  });

  wrapper.appendChild(inner);

  const footer = document.createElement("div");
  footer.innerText = "}";
  wrapper.appendChild(footer);

  // Toggle per object
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

// Parent toggle button (expand/collapse all)
function createParentToggle(container) {
  const btn = document.createElement("div");
  btn.id = "parentToggle";
  btn.innerText = "Collapse All";
  let collapsed = false;

  btn.addEventListener("click", () => {
    const allInner = container.querySelectorAll(".json-object > div:nth-child(2)");
    allInner.forEach(inner => {
      inner.style.display = collapsed ? "block" : "none";
    });

    const allToggle = container.querySelectorAll(".toggle-btn");
    allToggle.forEach(t => t.innerText = collapsed ? "[–]" : "[+]");

    collapsed = !collapsed;
    btn.innerText = collapsed ? "Expand All" : "Collapse All";
  });

  container.prepend(btn);
}

// Main
const bodyText = document.body.innerText.trim();
const parsed = isJSON(bodyText);

if (parsed) {
  document.body.innerHTML = "";
  const container = document.createElement("div");
  container.className = "pretty-json-container";
  document.body.appendChild(container);
  beautifyJSON(parsed, container);
  createParentToggle(container);
}
