// UI code - runs in iframe
console.log("=== RATIONALE PLUGIN UI SCRIPT STARTING ===");

interface Rationale {
  id: string;
  timestamp: string;
  frameIds: string[];
  decision: string;
  why: string;
  tradeoff: string;
  skipped: string[];
  confidence: "low" | "medium" | "high";
}

interface Frame {
  id: string;
  name: string;
}

type ViewMode = "empty" | "selection" | "add-form" | "view-rationales";

let currentFrames: Frame[] = [];
let currentRationales: Rationale[] = [];
let viewMode: ViewMode = "empty";
let skippedOptions: string[] = [];
let hasSelection: boolean = false;

// DOM elements - wait for DOM to be ready
let emptyState: HTMLElement;
let selectionView: HTMLElement;
let frameList: HTMLElement;
let nonFramesNote: HTMLElement;
let rationalesCount: HTMLElement;
let rationalesCountText: HTMLElement;
let viewRationalesBtn: HTMLElement;
let addRationaleBtn: HTMLElement;
let viewExistingBtn: HTMLElement;
let showIndicatorsToggle: HTMLInputElement;
let removeAllIndicatorsBtn: HTMLElement;
let projectContext: HTMLElement;
let projectContextHeader: HTMLElement;
let projectContextToggle: HTMLElement;
let projectContextBody: HTMLElement;
let problemFrameStatus: HTMLElement;
let projectContextCollapsed: boolean = false;
let problemText: HTMLTextAreaElement;
let whyNowText: HTMLTextAreaElement;
let metricRiskText: HTMLTextAreaElement;
let nonGoalsText: HTMLTextAreaElement;
let createProblemFrameBtn: HTMLElement;
let createAnotherProblemFrameBtn: HTMLElement;
let updateProblemFrameBtn: HTMLElement;
let selectProblemFrameBtn: HTMLElement;
let setProblemFrameBtn: HTMLElement; // Deprecated - kept for compatibility but not used
let addForm: HTMLElement;
let existingRationales: HTMLElement;
let decisionInput: HTMLInputElement;
let whyInput: HTMLTextAreaElement;
let tradeoffInput: HTMLInputElement;
let confidenceSelect: HTMLSelectElement;
let skippedOptionsContainer: HTMLElement;
let addSkippedBtn: HTMLElement;
let saveBtn: HTMLElement;
let cancelBtn: HTMLElement;

function initializeDOM(): void {
  console.log("Initializing DOM...");
  emptyState = document.getElementById("empty-state")!;
  selectionView = document.getElementById("selection-view")!;
  frameList = document.getElementById("frame-list")!;
  nonFramesNote = document.getElementById("non-frames-note")!;
  rationalesCount = document.getElementById("rationales-count")!;
  rationalesCountText = document.getElementById("rationales-count-text")!;
  viewRationalesBtn = document.getElementById("view-rationales-btn")!;
  addRationaleBtn = document.getElementById("add-rationale-btn")!;
  viewExistingBtn = document.getElementById("view-existing-btn")!;
  showIndicatorsToggle = document.getElementById("show-indicators-toggle") as HTMLInputElement;
  removeAllIndicatorsBtn = document.getElementById("remove-all-indicators-btn")!;
  projectContext = document.getElementById("project-context")!;
  projectContextHeader = document.getElementById("project-context-header")!;
  projectContextToggle = document.getElementById("project-context-toggle")!;
  projectContextBody = document.getElementById("project-context-body")!;
  problemFrameStatus = document.getElementById("problem-frame-status")!;
  problemText = document.getElementById("problem-text") as HTMLTextAreaElement;
  whyNowText = document.getElementById("why-now-text") as HTMLTextAreaElement;
  metricRiskText = document.getElementById("metric-risk-text") as HTMLTextAreaElement;
  nonGoalsText = document.getElementById("non-goals-text") as HTMLTextAreaElement;
  createProblemFrameBtn = document.getElementById("create-problem-frame-btn")!;
  createAnotherProblemFrameBtn = document.getElementById("create-another-problem-frame-btn")!;
  updateProblemFrameBtn = document.getElementById("update-problem-frame-btn")!;
  selectProblemFrameBtn = document.getElementById("select-problem-frame-btn")!;
  // Old button reference - kept for compatibility but not used
  setProblemFrameBtn = document.createElement("div"); // Dummy element to prevent errors
  addForm = document.getElementById("add-form")!;
  existingRationales = document.getElementById("existing-rationales")!;
  decisionInput = document.getElementById("decision") as HTMLInputElement;
  whyInput = document.getElementById("why") as HTMLTextAreaElement;
  tradeoffInput = document.getElementById("tradeoff") as HTMLInputElement;
  confidenceSelect = document.getElementById("confidence") as HTMLSelectElement;
  skippedOptionsContainer = document.getElementById("skipped-options")!;
  addSkippedBtn = document.getElementById("add-skipped-btn")!;
  saveBtn = document.getElementById("save-btn")!;
  cancelBtn = document.getElementById("cancel-btn")!;
  
  if (!emptyState || !selectionView) {
    console.error("Failed to find required DOM elements", {
      emptyState: !!emptyState,
      selectionView: !!selectionView
    });
    return;
  }
  
  console.log("DOM elements found, setting up UI...");
  // Initialize UI
  setupEventListeners();
  // Show empty state initially - make sure it's visible
  emptyState.style.display = "block";
  selectionView.style.display = "none";
  addForm.style.display = "none";
  existingRationales.style.display = "none";
  // Initial visibility: hide Project Context until we know selection state
  projectContext.style.display = "none";
  console.log("UI initialized, showing empty state. Requesting initial data...");
  // Request initial data
  parent.postMessage({ pluginMessage: { type: "get-rationales" } }, "*");
  parent.postMessage({ pluginMessage: { type: "get-state" } }, "*");
}

// Initialize when DOM is ready
console.log("UI script loaded, DOM ready state:", document.readyState);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired");
    initializeDOM();
  });
} else {
  console.log("DOM already ready, initializing immediately");
  initializeDOM();
}

function setupEventListeners(): void {
  // Add rationale button
  addRationaleBtn.addEventListener("click", () => {
    console.log("Add rationale button clicked");
    viewMode = "add-form";
    selectionView.style.display = "none";
    emptyState.style.display = "none";
    addForm.classList.add("active");
    addForm.style.display = "block";
    existingRationales.classList.remove("active");
    existingRationales.style.display = "none";
    console.log("Form should be visible now, active class:", addForm.classList.contains("active"));
    resetForm();
  });

  // View rationales function (shared)
  function viewRationales(): void {
    console.log("View rationales clicked");
    console.log("Current frames:", currentFrames);
    console.log("Current rationales:", currentRationales);
    // Request fresh data before rendering
    parent.postMessage({ pluginMessage: { type: "get-rationales" } }, "*");
    // Wait a bit for the message to be processed, then render
    setTimeout(() => {
      console.log("Rendering after refresh, rationales:", currentRationales);
      viewMode = "view-rationales";
      selectionView.style.display = "none";
      addForm.classList.remove("active");
      addForm.style.display = "none";
      existingRationales.classList.add("active");
      existingRationales.style.display = "block";
      renderRationales();
    }, 100);
  }

  // View existing button (legacy, kept for compatibility)
  viewExistingBtn.addEventListener("click", () => {
    viewRationales();
  });

  // View rationales button (inside count box)
  viewRationalesBtn.addEventListener("click", () => {
    viewRationales();
  });

  // Show indicators toggle
  showIndicatorsToggle.addEventListener("change", () => {
    const visible = showIndicatorsToggle.checked;
    console.log("Show indicators toggle:", visible);
    parent.postMessage({ pluginMessage: { type: "set-indicators-visible", visible } }, "*");
  });

  // Remove all indicators button
  removeAllIndicatorsBtn.addEventListener("click", () => {
    if (confirm("Remove all plugin indicators? This cannot be undone.")) {
      console.log("Remove all indicators button clicked");
      parent.postMessage({ pluginMessage: { type: "remove-all-indicators" } }, "*");
    }
  });

  // Project Context header toggle
  projectContextHeader.addEventListener("click", () => {
    projectContextCollapsed = !projectContextCollapsed;
    projectContextBody.style.display = projectContextCollapsed ? "none" : "block";
    projectContextToggle.textContent = projectContextCollapsed ? "▶" : "▼";
  });

  // Create Problem Frame button
  createProblemFrameBtn.addEventListener("click", () => {
    console.log("Create Problem Frame button clicked");
    parent.postMessage({
      pluginMessage: {
        type: "create-problem-frame",
        problem: problemText.value.trim(),
        whyNow: whyNowText.value.trim(),
        metricOrRisk: metricRiskText.value.trim(),
        nonGoals: nonGoalsText.value.trim(),
      },
    }, "*");
  });

  // Create another Problem Frame button
  createAnotherProblemFrameBtn.addEventListener("click", () => {
    console.log("Create another Problem Frame button clicked");
    parent.postMessage({
      pluginMessage: {
        type: "create-problem-frame",
        problem: problemText.value.trim(),
        whyNow: whyNowText.value.trim(),
        metricOrRisk: metricRiskText.value.trim(),
        nonGoals: nonGoalsText.value.trim(),
      },
    }, "*");
  });

  // Update Problem Frame button
  updateProblemFrameBtn.addEventListener("click", () => {
    console.log("Update Problem Frame button clicked");
    parent.postMessage({
      pluginMessage: {
        type: "update-problem-frame",
        problem: problemText.value.trim(),
        whyNow: whyNowText.value.trim(),
        metricOrRisk: metricRiskText.value.trim(),
        nonGoals: nonGoalsText.value.trim(),
      },
    }, "*");
  });

  // Select Problem Frame button
  selectProblemFrameBtn.addEventListener("click", () => {
    console.log("Select Problem Frame button clicked");
    parent.postMessage({
      pluginMessage: { type: "select-problem-frame" },
    }, "*");
  });

  // Cancel button
  cancelBtn.addEventListener("click", () => {
    viewMode = "selection";
    addForm.classList.remove("active");
    selectionView.style.display = "block";
    resetForm();
  });

  // Form validation
  decisionInput.addEventListener("input", updateSaveButton);
  whyInput.addEventListener("input", updateSaveButton);
  tradeoffInput.addEventListener("input", updateSaveButton);
  confidenceSelect.addEventListener("change", updateSaveButton);

  // Skipped options
  addSkippedBtn.addEventListener("click", () => {
    addSkippedOption();
  });

  // Save rationale
  saveBtn.addEventListener("click", () => {
    if (!validateForm()) return;

    const rationale = {
      frameIds: currentFrames.map((f) => f.id),
      decision: decisionInput.value.trim(),
      why: whyInput.value.trim(),
      tradeoff: tradeoffInput.value.trim(),
      skipped: skippedOptions.filter((s) => s.trim() !== ""),
      confidence: confidenceSelect.value as "low" | "medium" | "high",
    };

    parent.postMessage(
      { pluginMessage: { type: "save-rationale", ...rationale } },
      "*"
    );

    // Reset and go back to selection view
    resetForm();
    viewMode = "selection";
    addForm.classList.remove("active");
    selectionView.style.display = "block";
  });
}

// Notify main that UI is open
parent.postMessage({ pluginMessage: { type: "set-ui-open", open: true } }, "*");

// Keyboard shortcut: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows) to add rationale
// This only works when the plugin iframe is focused—does not interfere with
// native Figma shortcuts or browser refresh outside this iframe.
window.addEventListener("keydown", (event) => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifierKey = isMac ? event.metaKey : event.ctrlKey;

  if (modifierKey && event.shiftKey && event.key.toUpperCase() === "R") {
    // Only trigger if frames are selected and not already in the add form
    if (currentFrames.length > 0 && viewMode !== "add-form") {
      event.preventDefault();
      // Trigger the same behavior as clicking "Add rationale"
      viewMode = "add-form";
      selectionView.style.display = "none";
      emptyState.style.display = "none";
      addForm.classList.add("active");
      addForm.style.display = "block";
      existingRationales.classList.remove("active");
      existingRationales.style.display = "none";
      resetForm();
    }
  }
});

// Handle window close
window.addEventListener("beforeunload", () => {
  parent.postMessage({ pluginMessage: { type: "set-ui-open", open: false } }, "*");
});

// This function is no longer needed - button states are controlled by state machine

// Listen for messages from main
window.onmessage = (event) => {
  console.log("Received message from main:", event.data);
  const msg = event.data.pluginMessage;
  if (msg && msg.type === "state") {
    // Handle state machine updates
    hasSelection = msg.hasSelection || false;
    const problemFrameExists = msg.problemFrameExists || false;
    const problemFrameName = msg.problemFrameName || null;

    // Visibility rule: hide if hasSelection, show if !hasSelection
    projectContext.style.display = hasSelection ? "none" : "block";

    if (!hasSelection) {
      // State A: hasSelection=false AND problemFrameExists=false
      if (!problemFrameExists) {
        createProblemFrameBtn.style.display = "block";
        createAnotherProblemFrameBtn.style.display = "none";
        updateProblemFrameBtn.style.display = "none";
        selectProblemFrameBtn.style.display = "none";
        problemFrameStatus.style.display = "none";
        // Expand when no problem frame exists (user needs to fill form)
        projectContextCollapsed = false;
        projectContextBody.style.display = "block";
        projectContextToggle.textContent = "▼";
      } else {
        // State B: hasSelection=false AND problemFrameExists=true
        createProblemFrameBtn.style.display = "none";
        createAnotherProblemFrameBtn.style.display = "block";
        updateProblemFrameBtn.style.display = "block";
        selectProblemFrameBtn.style.display = "block";
        problemFrameStatus.style.display = "block";
        problemFrameStatus.textContent = `Problem Frame set: ${problemFrameName || "Unknown"}`;
        problemFrameStatus.style.background = "#e0f5e0";
        problemFrameStatus.style.color = "#060";
        // Collapse by default when problem frame exists
        projectContextCollapsed = true;
        projectContextBody.style.display = "none";
        projectContextToggle.textContent = "▶";
      }
    } else {
      // When there is a selection, hide the select button
      selectProblemFrameBtn.style.display = "none";
    }
  } else if (msg && msg.type === "selection-changed") {
    currentFrames = msg.frames || [];
    currentRationales = msg.rationales || [];
    hasSelection = msg.hasSelection || false;
    console.log("Updating UI with frames:", currentFrames.length, "rationales:", currentRationales.length);
    console.log("Rationales data:", JSON.stringify(currentRationales, null, 2));
    // Update Project Context visibility based on selection
    projectContext.style.display = hasSelection ? "none" : "block";
    // If we're in view-rationales mode, re-render
    if (viewMode === "view-rationales") {
      renderRationales();
    }
    updateUI(msg.hasNonFrames || false);
    // State will be sent automatically by sendSelectionToUI
  } else if (msg && msg.type === "problem-frame-data") {
    // Update UI with Problem Frame data
    if (msg.frameExists && msg.frameName) {
      problemFrameStatus.textContent = `Problem Frame: "${msg.frameName}"`;
      problemFrameStatus.style.background = "#e8f4fd";
      problemFrameStatus.style.color = "#0066cc";
    } else if (msg.problemFrameNodeId) {
      problemFrameStatus.textContent = "Problem Frame no longer exists. Please rebind to a frame.";
      problemFrameStatus.style.background = "#fff3cd";
      problemFrameStatus.style.color = "#856404";
    } else {
      problemFrameStatus.textContent = "No Problem Frame set. Select a frame and click 'Use selected frame as Problem Frame'.";
      problemFrameStatus.style.background = "#f5f5f5";
      problemFrameStatus.style.color = "#666";
    }
    problemText.value = msg.problem || "";
    whyNowText.value = msg.whyNow || "";
    metricRiskText.value = msg.metricOrRisk || "";
    nonGoalsText.value = msg.nonGoals || "";
  } else if (msg && msg.type === "problem-frame-created") {
    // State update will be sent automatically by main thread
    problemFrameStatus.textContent = `Problem Frame created: "${msg.frameName}"`;
    problemFrameStatus.style.display = "block";
    problemFrameStatus.style.background = "#e0f5e0";
    problemFrameStatus.style.color = "#060";
  } else if (msg && msg.type === "problem-frame-set") {
    // State update will be sent automatically by main thread
    problemFrameStatus.textContent = `Problem Frame set: "${msg.frameName}"`;
    problemFrameStatus.style.display = "block";
    problemFrameStatus.style.background = "#e0f5e0";
    problemFrameStatus.style.color = "#060";
  } else if (msg && msg.type === "problem-frame-updated") {
    // State update will be sent automatically by main thread
    problemFrameStatus.textContent = `Problem Frame updated: "${msg.frameName || 'Success'}"`;
    problemFrameStatus.style.display = "block";
    problemFrameStatus.style.background = "#e0f5e0";
    problemFrameStatus.style.color = "#060";
  } else if (msg && msg.type === "problem-frame-error") {
    problemFrameStatus.textContent = msg.message;
    problemFrameStatus.style.display = "block";
    problemFrameStatus.style.background = "#ffe0e0";
    problemFrameStatus.style.color = "#c00";
  }
};

function updateUI(hasNonFrames: boolean): void {
  console.log("Updating UI with frames:", currentFrames.length, "rationales:", currentRationales.length);
  
  // Update frame list
  frameList.innerHTML = "";
  currentFrames.forEach((frame) => {
    const li = document.createElement("li");
    li.textContent = frame.name;
    frameList.appendChild(li);
  });

  // Show/hide non-frames note
  nonFramesNote.style.display = hasNonFrames ? "block" : "none";
  
  // Button states are now controlled by the state machine, no need to update here

  if (currentFrames.length === 0) {
    // Empty state
    viewMode = "empty";
    emptyState.style.display = "block";
    selectionView.style.display = "none";
    addForm.classList.remove("active");
    existingRationales.classList.remove("active");
  } else {
    // Selection view
    emptyState.style.display = "none";
    selectionView.style.display = "block";
    addForm.classList.remove("active");
    addForm.style.display = "none";
    
    // Show existing rationales if any
    // Remove any existing multi-frame note first
    const existingNote = selectionView.querySelector(".multi-frame-note");
    if (existingNote) existingNote.remove();
    
    if (currentRationales.length > 0) {
      // Show rationale count inside selection summary
      const count = currentRationales.length;
      rationalesCountText.textContent = `${count} Rationale${count === 1 ? "" : "s"}`;
      rationalesCount.style.display = "flex";
      
      if (currentFrames.length === 1) {
        // Show "view" button inside count box for single frame selection
        viewRationalesBtn.style.display = "block";
        viewExistingBtn.style.display = "none";
        viewMode = "selection";
      } else {
        viewRationalesBtn.style.display = "none";
        viewExistingBtn.style.display = "none";
        // Show a note about multiple frames
        const note = document.createElement("div");
        note.className = "non-frames-note multi-frame-note";
        note.style.marginTop = "12px";
        note.textContent = `Multiple frames selected. Select a single frame to view its rationale history.`;
        selectionView.appendChild(note);
        viewMode = "selection";
      }
    } else {
      rationalesCount.style.display = "none";
      viewRationalesBtn.style.display = "none";
      viewExistingBtn.style.display = "none";
      viewMode = "selection";
    }
    
    // Ensure existing rationales view is hidden when showing selection
    existingRationales.classList.remove("active");
    existingRationales.style.display = "none";
  }
}

// Form validation
function validateForm(): boolean {
  return (
    decisionInput.value.trim() !== "" &&
    whyInput.value.trim() !== "" &&
    tradeoffInput.value.trim() !== "" &&
    confidenceSelect.value !== ""
  );
}

function updateSaveButton(): void {
  saveBtn.disabled = !validateForm();
}

// Skipped options
function addSkippedOption(value: string = ""): void {
  const index = skippedOptions.length;
  skippedOptions.push(value);
  renderSkippedOptions();
}

function removeSkippedOption(index: number): void {
  skippedOptions.splice(index, 1);
  renderSkippedOptions();
}

function renderSkippedOptions(): void {
  skippedOptionsContainer.innerHTML = "";
  skippedOptions.forEach((value, index) => {
    const div = document.createElement("div");
    div.className = "skipped-item";
    
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.placeholder = "Skipped option";
    input.addEventListener("input", (e) => {
      skippedOptions[index] = (e.target as HTMLInputElement).value;
    });
    
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeSkippedOption(index));
    
    div.appendChild(input);
    div.appendChild(removeBtn);
    skippedOptionsContainer.appendChild(div);
  });
}

function resetForm(): void {
  decisionInput.value = "";
  whyInput.value = "";
  tradeoffInput.value = "";
  confidenceSelect.value = "";
  skippedOptions = [];
  renderSkippedOptions();
  updateSaveButton();
}

// Render rationales list
function renderRationales(): void {
  console.log("Rendering rationales, count:", currentRationales.length);
  
  // Clear existing content
  existingRationales.innerHTML = "";

  if (currentRationales.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No rationales yet. Add one to get started!";
    p.style.padding = "20px";
    p.style.textAlign = "center";
    p.style.color = "#666";
    existingRationales.appendChild(p);
    
    // Add back button
    const backBtn = document.createElement("button");
    backBtn.className = "button button-secondary";
    backBtn.textContent = "Back";
    backBtn.style.marginTop = "16px";
    backBtn.addEventListener("click", () => {
      viewMode = "selection";
      existingRationales.classList.remove("active");
      existingRationales.style.display = "none";
      selectionView.style.display = "block";
    });
    existingRationales.appendChild(backBtn);
    return;
  }

  // Sort by timestamp (newest first)
  const sorted = [...currentRationales].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  sorted.forEach((rationale) => {
    const card = document.createElement("div");
    card.className = "rationale-card";

    const header = document.createElement("div");
    header.className = "rationale-header";
    header.addEventListener("click", () => {
      card.classList.toggle("expanded");
    });

    const title = document.createElement("div");
    title.className = "rationale-title";
    title.textContent = rationale.decision;

    const meta = document.createElement("div");
    meta.className = "rationale-meta";
    const date = new Date(rationale.timestamp);
    meta.textContent = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const confidenceBadge = document.createElement("span");
    confidenceBadge.className = `confidence-badge confidence-${rationale.confidence}`;
    confidenceBadge.textContent = rationale.confidence.charAt(0).toUpperCase() + rationale.confidence.slice(1);
    meta.appendChild(confidenceBadge);

    header.appendChild(title);
    header.appendChild(meta);

    const body = document.createElement("div");
    body.className = "rationale-body";

    const whyField = createField("Why", rationale.why);
    const tradeoffField = createField("Tradeoff accepted", rationale.tradeoff);
    
    body.appendChild(whyField);
    body.appendChild(tradeoffField);

    if (rationale.skipped && rationale.skipped.length > 0) {
      const skippedField = document.createElement("div");
      skippedField.className = "rationale-field";
      const skippedLabel = document.createElement("div");
      skippedLabel.className = "rationale-field-label";
      skippedLabel.textContent = "Skipped options";
      const skippedValue = document.createElement("div");
      skippedValue.className = "rationale-field-value";
      const ul = document.createElement("ul");
      rationale.skipped.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      skippedValue.appendChild(ul);
      skippedField.appendChild(skippedLabel);
      skippedField.appendChild(skippedValue);
      body.appendChild(skippedField);
    }

    card.appendChild(header);
    card.appendChild(body);
    existingRationales.appendChild(card);
  });

  // Add "Add another" and "Back" buttons
  const buttonContainer = document.createElement("div");
  buttonContainer.style.marginTop = "16px";
  buttonContainer.style.display = "flex";
  buttonContainer.style.gap = "8px";
  
  const backBtn = document.createElement("button");
  backBtn.className = "button button-secondary";
  backBtn.textContent = "Back";
  backBtn.style.flex = "1";
  backBtn.addEventListener("click", () => {
    viewMode = "selection";
    existingRationales.classList.remove("active");
    existingRationales.style.display = "none";
    selectionView.style.display = "block";
  });
  
  const addAnotherBtn = document.createElement("button");
  addAnotherBtn.className = "button";
  addAnotherBtn.textContent = "Add another rationale";
  addAnotherBtn.style.flex = "1";
  addAnotherBtn.addEventListener("click", () => {
    viewMode = "add-form";
    existingRationales.classList.remove("active");
    existingRationales.style.display = "none";
    addForm.classList.add("active");
    addForm.style.display = "block";
    resetForm();
  });
  
  buttonContainer.appendChild(backBtn);
  buttonContainer.appendChild(addAnotherBtn);
  existingRationales.appendChild(buttonContainer);
}

function createField(label: string, value: string): HTMLElement {
  const field = document.createElement("div");
  field.className = "rationale-field";
  
  const fieldLabel = document.createElement("div");
  fieldLabel.className = "rationale-field-label";
  fieldLabel.textContent = label;
  
  const fieldValue = document.createElement("div");
  fieldValue.className = "rationale-field-value";
  fieldValue.textContent = value;
  
  field.appendChild(fieldLabel);
  field.appendChild(fieldValue);
  return field;
}

