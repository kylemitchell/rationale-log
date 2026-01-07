// Main plugin code - runs in Figma's sandbox

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

interface PluginData {
  rationales: Rationale[];
  problemFrameNodeId?: string;
  problem?: string;
  whyNow?: string;
  metricOrRisk?: string;
  nonGoals?: string;
}

// Stroke indicator removed - using glyph indicator instead

let uiOpen = false;

// Load plugin data
function loadPluginData(): PluginData {
  const data = figma.root.getPluginData("rationales");
  const problemFrameNodeId = figma.root.getPluginData("problemFrameNodeId");
  const problem = figma.root.getPluginData("problem");
  const whyNow = figma.root.getPluginData("whyNow");
  const metricOrRisk = figma.root.getPluginData("metricOrRisk");
  const nonGoals = figma.root.getPluginData("nonGoals");
  
  let parsedRationales: Rationale[] = [];
  try {
    if (data) {
      const parsed = JSON.parse(data);
      // Handle backward compatibility: if it's an object with a rationales property, use that
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.rationales) {
        parsedRationales = Array.isArray(parsed.rationales) ? parsed.rationales : [];
      } else if (Array.isArray(parsed)) {
        parsedRationales = parsed;
      }
    }
  } catch {
    parsedRationales = [];
  }
  
  // Ensure rationales is always an array
  if (!Array.isArray(parsedRationales)) {
    parsedRationales = [];
  }
  
  return {
    rationales: parsedRationales,
    problemFrameNodeId: problemFrameNodeId || undefined,
    problem: problem || undefined,
    whyNow: whyNow || undefined,
    metricOrRisk: metricOrRisk || undefined,
    nonGoals: nonGoals || undefined,
  };
}

// Save plugin data
function savePluginData(data: PluginData): void {
  figma.root.setPluginData("rationales", JSON.stringify(data.rationales));
  if (data.problemFrameNodeId) {
    figma.root.setPluginData("problemFrameNodeId", data.problemFrameNodeId);
  } else {
    figma.root.setPluginData("problemFrameNodeId", "");
  }
  if (data.problem) {
    figma.root.setPluginData("problem", data.problem);
  } else {
    figma.root.setPluginData("problem", "");
  }
  if (data.whyNow) {
    figma.root.setPluginData("whyNow", data.whyNow);
  } else {
    figma.root.setPluginData("whyNow", "");
  }
  if (data.metricOrRisk) {
    figma.root.setPluginData("metricOrRisk", data.metricOrRisk);
  } else {
    figma.root.setPluginData("metricOrRisk", "");
  }
  if (data.nonGoals) {
    figma.root.setPluginData("nonGoals", data.nonGoals);
  } else {
    figma.root.setPluginData("nonGoals", "");
  }
}

// Get frames from selection
function getSelectedFrames(): FrameNode[] {
  return figma.currentPage.selection.filter(
    (node): node is FrameNode => node.type === "FRAME"
  );
}

// Get all frame IDs that have rationales
function getFramesWithRationales(): Set<string> {
  const data = loadPluginData();
  const frameIds = new Set<string>();
  data.rationales.forEach((r) => {
    r.frameIds.forEach((id) => frameIds.add(id));
  });
  return frameIds;
}

// ============================================================================
// Indicator helper functions
// ============================================================================

// Check if a node is a frame
function isFrame(node: SceneNode): node is FrameNode {
  return node.type === "FRAME";
}

// Get all rationales for a specific frame
function getRationalesForFrame(frameId: string): Rationale[] {
  const data = loadPluginData();
  return data.rationales.filter((r) => r.frameIds.includes(frameId));
}

// Check if a frame has at least one rationale
function frameHasRationales(frameId: string): boolean {
  return getRationalesForFrame(frameId).length > 0;
}

// ============================================================================
// Indicator helper functions - inside-frame approach
// ============================================================================
// Indicators are placed INSIDE frames (option A) to keep them with the frame.
// Note: If "Clip content" is enabled, indicators may be clipped, but this approach
// is simpler and keeps indicators visually associated with their frames.

// Find or create the plugin group inside a frame
// This group contains the indicator node and is locked to prevent accidental interaction
function findOrCreatePluginGroup(frame: FrameNode): GroupNode | null {
  try {
    // Look for existing group
    const existingGroup = frame.findOne((node) => 
      node.name === "_Rationale (plugin)" && node.type === "GROUP"
    );
    if (existingGroup && existingGroup.type === "GROUP") {
      return existingGroup;
    }
    
    // Create new group - figma.group() requires at least one node
    // Create a tiny invisible rectangle to group
    const placeholder = figma.createRectangle();
    placeholder.resize(1, 1);
    placeholder.fills = [];
    placeholder.opacity = 0;
    placeholder.x = 0;
    placeholder.y = 0;
    frame.appendChild(placeholder);
    
    const group = figma.group([placeholder], frame);
    group.name = "_Rationale (plugin)";
    group.locked = true; // Lock the group to prevent accidental interaction
    return group;
  } catch (e) {
    return null;
  }
}

// Find or create the indicator node inside the plugin group
async function findOrCreateIndicator(group: GroupNode): Promise<SceneNode | null> {
  try {
    // Look for existing indicator
    const existingIndicator = group.findOne((node) => node.name === "_RationaleIndicator");
    if (existingIndicator) {
      return existingIndicator;
    }
    
    // Create new indicator
    let indicator: SceneNode;
    try {
      // Try text glyph first
      indicator = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      indicator.characters = "📄"; // Document/page glyph
      indicator.fontSize = 12;
    } catch (e) {
      // Fallback to rectangle if font loading fails
      indicator = figma.createRectangle();
      indicator.resize(12, 12);
      (indicator as RectangleNode).fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
    }
    
    indicator.name = "_RationaleIndicator";
    if ('opacity' in indicator) {
      indicator.opacity = 0.5; // Low visual prominence
    }
    indicator.locked = true; // Locked to prevent accidental interaction
    
    // Add to group
    group.appendChild(indicator);
    
    return indicator;
  } catch (e) {
    return null;
  }
}

// Ensure indicator exists inside a frame (create if missing, update position if exists)
async function ensureIndicatorInFrame(frame: FrameNode): Promise<void> {
  try {
    if (!frameHasRationales(frame.id)) return;
    
    const group = findOrCreatePluginGroup(frame);
    if (!group) return;
    
    const indicator = await findOrCreateIndicator(group);
    if (!indicator) return;
    
    // Position indicator at top-right with inset
    const inset = 6;
    indicator.x = frame.width - inset - (indicator.width || 12);
    indicator.y = inset;
  } catch (e) {
    // Silently handle errors
  }
}

// Set visibility of all indicators (opacity 0 to hide, ~0.5 to show)
// Used by "Show indicators" toggle
function setAllIndicatorsVisibility(visible: boolean): void {
  try {
    const currentPage = figma.currentPage;
    const allGroups = currentPage.findAll((node) => 
      node.name === "_Rationale (plugin)" && node.type === "GROUP"
    ) as GroupNode[];
    
    for (const group of allGroups) {
      const indicator = group.findOne((node) => node.name === "_RationaleIndicator");
      if (indicator && 'opacity' in indicator) {
        indicator.opacity = visible ? 0.5 : 0;
      }
    }
  } catch (e) {
    // Silently handle errors
  }
}

// Remove all plugin indicator groups from the current page
// Used by "Remove all plugin indicators" button for cleaning before handoff
function removeAllIndicators(): void {
  try {
    const currentPage = figma.currentPage;
    const allGroups = currentPage.findAll((node) => 
      node.name === "_Rationale (plugin)" && node.type === "GROUP"
    ) as GroupNode[];
    
    for (const group of allGroups) {
      group.remove();
    }
  } catch (e) {
    // Silently handle errors
  }
}

// Stroke indicator removed - using glyph indicator instead

// Send state update to UI
function sendStateToUI(): void {
  if (!figma.ui || !uiOpen || !messageHandlerSetup) return;

  try {
    const selection = figma.currentPage.selection;
    const hasSelection = selection.length > 0;
    const selectedCount = selection.length;
    const data = loadPluginData();

    let problemFrameExists = false;
    let problemFrameName: string | null = null;

    if (data.problemFrameNodeId) {
      try {
        const node = figma.getNodeById(data.problemFrameNodeId);
        if (node && node.type === "FRAME") {
          problemFrameExists = true;
          problemFrameName = node.name;
        } else {
          // Stale ID cleanup: node is missing or not a FRAME
          figma.root.setPluginData("problemFrameNodeId", "");
        }
      } catch (e) {
        // Node doesn't exist - clear stale ID
        figma.root.setPluginData("problemFrameNodeId", "");
      }
    }

    if (figma.ui && uiOpen && messageHandlerSetup) {
      figma.ui.postMessage({
        type: "state",
        hasSelection,
        selectedCount,
        problemFrameExists,
        problemFrameName,
      });
    }
  } catch (error) {
    // Silently handle errors
    return;
  }
}

// Send selection to UI - ABSOLUTELY NO ERRORS
function sendSelectionToUI(): void {
  // Triple check - exit immediately if any condition fails
  if (!figma.ui) return;
  if (!uiOpen) return;
  if (!messageHandlerSetup) return;
  
  // Wrap in try-catch that swallows EVERYTHING
  try {
    // Verify UI still exists
    if (!figma.ui) return;
    
    const frames = getSelectedFrames();
    const nonFrames = figma.currentPage.selection.filter(
      (node) => node.type !== "FRAME"
    );

    const data = loadPluginData();
    const frameIds = frames.map((f) => f.id);
    
    const relevantRationales = data.rationales.filter((r) =>
      r.frameIds.some((id) => frameIds.includes(id))
    );

    // Final verification before postMessage
    if (figma.ui && uiOpen && messageHandlerSetup) {
      figma.ui.postMessage({
        type: "selection-changed",
        frames: frames.map((f) => ({ id: f.id, name: f.name })),
        rationales: relevantRationales,
        hasNonFrames: nonFrames.length > 0,
        hasSelection: frames.length > 0,
      });
    }
    
    // Also send state update
    sendStateToUI();
  } catch (error) {
    // ABSOLUTELY SILENT - do nothing, say nothing
    return;
  }
}

// Handle messages from UI
let messageHandlerSetup = false;

function setupUIMessageHandler(): void {
  if (!figma.ui) return;
  if (messageHandlerSetup) return;
  
  try {
    figma.ui.onmessage = async (msg) => {
      // Only process if UI is fully ready
      if (!figma.ui || !uiOpen || !messageHandlerSetup) return;
      
      switch (msg.type) {
        case "get-rationales":
          if (uiOpen && figma.ui && messageHandlerSetup) {
            sendSelectionToUI();
          }
          break;

        case "get-state":
          if (uiOpen && figma.ui && messageHandlerSetup) {
            sendStateToUI();
          }
          break;

        case "get-problem-frame-data":
          // Send Problem Frame data to UI
          if (uiOpen && figma.ui && messageHandlerSetup) {
            const data = loadPluginData();
            let frameName: string | null = null;
            let frameExists = false;
            if (data.problemFrameNodeId) {
              try {
                const node = figma.getNodeById(data.problemFrameNodeId);
                if (node && node.type === "FRAME") {
                  frameName = node.name;
                  frameExists = true;
                }
              } catch (e) {
                // Node doesn't exist
              }
            }
            figma.ui.postMessage({
              type: "problem-frame-data",
              problemFrameNodeId: data.problemFrameNodeId || null,
              frameName: frameName,
              frameExists: frameExists,
              problem: data.problem || "",
              whyNow: data.whyNow || "",
              metricOrRisk: data.metricOrRisk || "",
              nonGoals: data.nonGoals || "",
            });
          }
          break;

        case "save-rationale": {
          const data = loadPluginData();
          const newRationale: Rationale = {
            id: msg.id || figma.root.id + Date.now().toString(),
            timestamp: new Date().toISOString(),
            frameIds: msg.frameIds,
            decision: msg.decision,
            why: msg.why,
            tradeoff: msg.tradeoff,
            skipped: msg.skipped || [],
            confidence: msg.confidence,
          };
          data.rationales.push(newRationale);
          savePluginData(data);
          
          // Ensure indicators for all frames that received this rationale
          msg.frameIds.forEach((frameId: string) => {
            const frame = figma.getNodeById(frameId);
            if (frame && frame.type === "FRAME") {
              ensureIndicatorInFrame(frame as FrameNode).catch(() => {});
            }
          });
          
          if (uiOpen && figma.ui && messageHandlerSetup) {
            sendSelectionToUI();
          }
          break;
        }

        case "set-ui-open":
          uiOpen = msg.open;
          break;

        case "set-indicators-visible":
          setAllIndicatorsVisibility(msg.visible);
          // If showing, ensure indicators exist for frames with rationales
          if (msg.visible) {
            const framesWithRationales = getFramesWithRationales();
            const currentPage = figma.currentPage;
            const allFrames = currentPage.findAll((node) => node.type === "FRAME") as FrameNode[];
            for (const frame of allFrames) {
              if (framesWithRationales.has(frame.id)) {
                ensureIndicatorInFrame(frame).catch(() => {});
              }
            }
          }
          break;

        case "remove-all-indicators":
          removeAllIndicators();
          break;

        case "select-problem-frame": {
          // Select and zoom to the Problem Frame
          const data = loadPluginData();
          if (data.problemFrameNodeId) {
            try {
              const node = figma.getNodeById(data.problemFrameNodeId);
              if (node && node.type === "FRAME") {
                figma.currentPage.selection = [node];
                figma.viewport.scrollAndZoomIntoView([node]);
                if (figma.ui && uiOpen && messageHandlerSetup) {
                  figma.ui.postMessage({
                    type: "problem-frame-selected",
                    frameName: node.name,
                  });
                }
              } else {
                // Stale ID - clear it and notify UI
                figma.root.setPluginData("problemFrameNodeId", "");
                if (figma.ui && uiOpen && messageHandlerSetup) {
                  figma.ui.postMessage({
                    type: "problem-frame-error",
                    message: "Problem Frame no longer exists.",
                  });
                  sendStateToUI();
                }
              }
            } catch (e) {
              // Node doesn't exist - clear stale ID
              figma.root.setPluginData("problemFrameNodeId", "");
              if (figma.ui && uiOpen && messageHandlerSetup) {
                figma.ui.postMessage({
                  type: "problem-frame-error",
                  message: "Problem Frame no longer exists.",
                });
                sendStateToUI();
              }
            }
          }
          break;
        }

        case "create-problem-frame": {
          // Create a new Problem Frame scaffold with styled layout using autolayout
          try {
            const frame = figma.createFrame();
            frame.name = "⛳ Problem";

            // Set frame background color (white)
            frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

            // Enable autolayout (vertical)
            frame.layoutMode = "VERTICAL";
            frame.paddingLeft = 24;
            frame.paddingRight = 24;
            frame.paddingTop = 24;
            frame.paddingBottom = 24;
            frame.itemSpacing = 16;
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "FIXED";
            frame.counterAxisAlignItems = "MIN";
            frame.layoutAlign = "STRETCH";

            // Set corner radius
            frame.cornerRadius = 8;

            // Set initial width (height will hug content)
            frame.resize(500, 100);
            frame.primaryAxisSizingMode = "AUTO"; // Hug contents vertically
            frame.x = figma.viewport.center.x - 250;
            frame.y = figma.viewport.center.y - 200;

            // Load fonts
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });

            // Create header "⛳ Context"
            const headerNode = figma.createText();
            headerNode.name = "PF__Header";
            headerNode.characters = "⛳ Context";
            headerNode.fontName = { family: "Inter", style: "Bold" };
            headerNode.fontSize = 24;
            headerNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
            headerNode.resize(452, 32);
            headerNode.textAutoResize = "HEIGHT";
            frame.appendChild(headerNode);

            // Define sections with labels
            const sections = [
              { label: "Problem", key: "PF__Problem", content: msg.problem || "" },
              { label: "Why Now", key: "PF__WhyNow", content: msg.whyNow || "" },
              { label: "Primary Metric", key: "PF__MetricOrRisk", content: msg.metricOrRisk || "" },
              { label: "Non Goals", key: "PF__NonGoals", content: msg.nonGoals || "", isBulletList: true },
            ];

            for (const section of sections) {
              // Create section container frame with autolayout
              const sectionFrame = figma.createFrame();
              sectionFrame.name = `${section.key}_Section`;
              sectionFrame.layoutMode = "VERTICAL";
              sectionFrame.paddingLeft = 0;
              sectionFrame.paddingRight = 0;
              sectionFrame.paddingTop = 0;
              sectionFrame.paddingBottom = 0;
              sectionFrame.itemSpacing = 4;
              sectionFrame.primaryAxisSizingMode = "AUTO";
              sectionFrame.counterAxisSizingMode = "FIXED";
              sectionFrame.counterAxisAlignItems = "MIN";
              sectionFrame.layoutAlign = "STRETCH";
              sectionFrame.fills = [];

              // Create label (18px Bold, black)
              const labelNode = figma.createText();
              labelNode.name = `${section.key}_Label`;
              labelNode.characters = section.label;
              labelNode.fontName = { family: "Inter", style: "Bold" };
              labelNode.fontSize = 18;
              labelNode.lineHeight = { value: 150, unit: "PERCENT" };
              labelNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
              labelNode.resize(452, 24); // 500 - 24*2 = 452
              labelNode.textAutoResize = "HEIGHT";
              sectionFrame.appendChild(labelNode);

              // Create content text (18px Regular, black)
              const contentNode = figma.createText();
              contentNode.name = section.key;
              // Format non-goals as bullet list if needed
              let contentText = section.content || "—";
              if (section.isBulletList && contentText && contentText !== "—") {
                // Convert lines to bullet points if not already formatted
                const lines = contentText.split("\n").filter((l: string) => l.trim());
                contentText = lines.map((l: string) => l.startsWith("•") ? l : `• ${l.trim()}`).join("\n");
              }
              contentNode.characters = contentText;
              contentNode.fontName = { family: "Inter", style: "Regular" };
              contentNode.fontSize = 18;
              contentNode.lineHeight = { value: 150, unit: "PERCENT" };
              contentNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
              contentNode.resize(452, 100); // 500 - 24*2 = 452
              contentNode.textAutoResize = "HEIGHT";
              sectionFrame.appendChild(contentNode);

              // Add section to main frame
              frame.appendChild(sectionFrame);
            }

            // Create footer section with divider
            const footerFrame = figma.createFrame();
            footerFrame.name = "PF__Footer_Section";
            footerFrame.layoutMode = "VERTICAL";
            footerFrame.paddingLeft = 0;
            footerFrame.paddingRight = 0;
            footerFrame.paddingTop = 8;
            footerFrame.paddingBottom = 0;
            footerFrame.itemSpacing = 0;
            footerFrame.primaryAxisSizingMode = "AUTO";
            footerFrame.counterAxisSizingMode = "FIXED";
            footerFrame.counterAxisAlignItems = "MIN";
            footerFrame.layoutAlign = "STRETCH";
            footerFrame.fills = [];
            // Add top border stroke
            footerFrame.strokes = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];
            footerFrame.strokeWeight = 1;
            footerFrame.strokeAlign = "INSIDE";
            footerFrame.strokeTopWeight = 1;
            footerFrame.strokeBottomWeight = 0;
            footerFrame.strokeLeftWeight = 0;
            footerFrame.strokeRightWeight = 0;

            // Create footer text
            const footerNode = figma.createText();
            footerNode.name = "PF__Footer";
            footerNode.characters = "This frame captures the problem as understood at the start of design. It may evolve.";
            footerNode.fontName = { family: "Inter", style: "Regular" };
            footerNode.fontSize = 14;
            footerNode.lineHeight = { value: 150, unit: "PERCENT" };
            footerNode.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
            footerNode.resize(452, 24);
            footerNode.textAutoResize = "HEIGHT";
            footerFrame.appendChild(footerNode);

            frame.appendChild(footerFrame);
            
            // Store the frame ID and context
            const data = loadPluginData();
            data.problemFrameNodeId = frame.id;
            data.problem = msg.problem || "";
            data.whyNow = msg.whyNow || "";
            data.metricOrRisk = msg.metricOrRisk || "";
            data.nonGoals = msg.nonGoals || "";
            savePluginData(data);
            
            // Select the new frame
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);
            
            // Send confirmation
            if (figma.ui && uiOpen && messageHandlerSetup) {
              figma.ui.postMessage({
                type: "problem-frame-created",
                frameName: frame.name,
              });
              sendStateToUI();
            }
          } catch (e) {
            if (figma.ui && uiOpen && messageHandlerSetup) {
              figma.ui.postMessage({
                type: "problem-frame-error",
                message: "Failed to create Problem Frame. Please try again.",
              });
            }
          }
          break;
        }

        case "set-problem-frame": {
          // Store the selected frame as Problem Frame
          // Updates are manual to avoid accidental overwrites
          const frames = getSelectedFrames();
          if (frames.length === 1) {
            const data = loadPluginData();
            data.problemFrameNodeId = frames[0].id;
            savePluginData(data);
            // Send confirmation back to UI
            if (figma.ui && uiOpen && messageHandlerSetup) {
              figma.ui.postMessage({
                type: "problem-frame-set",
                frameName: frames[0].name,
              });
              sendStateToUI();
            }
          }
          break;
        }

        case "update-problem-frame": {
          // Update Problem Frame with current values
          // This is manual-only to prevent accidental overwrites
          const data = loadPluginData();
          if (!data.problemFrameNodeId) {
            if (figma.ui && uiOpen && messageHandlerSetup) {
              figma.ui.postMessage({
                type: "problem-frame-error",
                message: "No Problem Frame set. Please select a frame and click 'Use selected frame as Problem Frame'.",
              });
            }
            break;
          }

          // Find the Problem Frame by nodeId
          let problemFrame: FrameNode | null = null;
          try {
            const node = figma.getNodeById(data.problemFrameNodeId);
            if (node && node.type === "FRAME") {
              problemFrame = node;
            }
          } catch (e) {
            // Node doesn't exist
          }

          if (!problemFrame) {
            if (figma.ui && uiOpen && messageHandlerSetup) {
              figma.ui.postMessage({
                type: "problem-frame-error",
                message: "Problem Frame no longer exists. Please rebind to a frame.",
              });
            }
            break;
          }

          // Load fonts for updates
          await figma.loadFontAsync({ family: "Inter", style: "Bold" });
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });

          // Set white background
          problemFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

          // Ensure frame has autolayout enabled with correct settings
          if (problemFrame.layoutMode === "NONE") {
            problemFrame.layoutMode = "VERTICAL";
            problemFrame.paddingLeft = 24;
            problemFrame.paddingRight = 24;
            problemFrame.paddingTop = 24;
            problemFrame.paddingBottom = 24;
            problemFrame.itemSpacing = 16;
            problemFrame.primaryAxisSizingMode = "AUTO";
            problemFrame.counterAxisSizingMode = "FIXED";
            problemFrame.counterAxisAlignItems = "MIN";
            problemFrame.layoutAlign = "STRETCH";
            problemFrame.cornerRadius = 8;
          } else {
            // Update existing autolayout settings
            problemFrame.paddingLeft = 24;
            problemFrame.paddingRight = 24;
            problemFrame.paddingTop = 24;
            problemFrame.paddingBottom = 24;
            problemFrame.itemSpacing = 16;
            problemFrame.primaryAxisSizingMode = "AUTO"; // Hug contents vertically
          }

          // Update width to 500px if different
          if (problemFrame.counterAxisSizingMode === "FIXED" && problemFrame.width !== 500) {
            problemFrame.resize(500, problemFrame.height);
          }

          // Update or create the four text layers with labels
          const sections = [
            { label: "Problem", key: "PF__Problem", content: msg.problem || "", isBulletList: false },
            { label: "Why Now", key: "PF__WhyNow", content: msg.whyNow || "", isBulletList: false },
            { label: "Primary Metric", key: "PF__MetricOrRisk", content: msg.metricOrRisk || "", isBulletList: false },
            { label: "Non Goals", key: "PF__NonGoals", content: msg.nonGoals || "", isBulletList: true },
          ];

          try {
            // Find or create header
            let headerNode = problemFrame.findOne((node) =>
              node.name === "PF__Header" && node.type === "TEXT"
            ) as TextNode | null;

            if (!headerNode) {
              headerNode = figma.createText();
              headerNode.name = "PF__Header";
              headerNode.characters = "⛳ Context";
              headerNode.fontName = { family: "Inter", style: "Bold" };
              headerNode.fontSize = 24;
              headerNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
              headerNode.resize(452, 32);
              headerNode.textAutoResize = "HEIGHT";
              problemFrame.insertChild(0, headerNode);
            }

            for (const section of sections) {
              // Find existing section frame or create new one
              let sectionFrame = problemFrame.findOne((node) =>
                node.name === `${section.key}_Section` && node.type === "FRAME"
              ) as FrameNode | null;

              if (!sectionFrame) {
                // Create new section frame with autolayout
                sectionFrame = figma.createFrame();
                sectionFrame.name = `${section.key}_Section`;
                sectionFrame.layoutMode = "VERTICAL";
                sectionFrame.paddingLeft = 0;
                sectionFrame.paddingRight = 0;
                sectionFrame.paddingTop = 0;
                sectionFrame.paddingBottom = 0;
                sectionFrame.itemSpacing = 4;
                sectionFrame.primaryAxisSizingMode = "AUTO";
                sectionFrame.counterAxisSizingMode = "FIXED";
                sectionFrame.counterAxisAlignItems = "MIN";
                sectionFrame.layoutAlign = "STRETCH";
                sectionFrame.fills = [];
                problemFrame.appendChild(sectionFrame);
              } else {
                // Update spacing to match design
                sectionFrame.itemSpacing = 4;
              }

              // Find or create label
              const labelName = `${section.key}_Label`;
              let labelNode = sectionFrame.findOne((node) =>
                node.name === labelName && node.type === "TEXT"
              ) as TextNode | null;

              if (!labelNode) {
                labelNode = figma.createText();
                await figma.loadFontAsync({ family: "Inter", style: "Bold" });
                labelNode.name = labelName;
                labelNode.characters = section.label;
                labelNode.fontName = { family: "Inter", style: "Bold" };
                labelNode.fontSize = 18;
                labelNode.lineHeight = { value: 150, unit: "PERCENT" };
                labelNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
                labelNode.resize(452, 24); // 500 - 24*2 = 452
                labelNode.textAutoResize = "HEIGHT";
                sectionFrame.insertChild(0, labelNode);
              } else {
                // Update styling to match design
                labelNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
                labelNode.characters = section.label;
                if (labelNode.fontSize !== 18) {
                  labelNode.fontSize = 18;
                }
                if (labelNode.width !== 452) {
                  labelNode.resize(452, labelNode.height);
                }
              }

              // Find or create content text node
              let textNode = sectionFrame.findOne((node) =>
                node.name === section.key && node.type === "TEXT"
              ) as TextNode | null;

              if (!textNode) {
                textNode = figma.createText();
                await figma.loadFontAsync({ family: "Inter", style: "Regular" });
                textNode.name = section.key;
                textNode.fontName = { family: "Inter", style: "Regular" };
                textNode.fontSize = 18;
                textNode.lineHeight = { value: 150, unit: "PERCENT" };
                textNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
                textNode.resize(452, 100); // 500 - 24*2 = 452
                textNode.textAutoResize = "HEIGHT";
                sectionFrame.appendChild(textNode);
              } else {
                // Ensure font is loaded before updating
                await figma.loadFontAsync({ family: (textNode.fontName as FontName).family, style: (textNode.fontName as FontName).style });
                // Update styling to match design
                textNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
                if (textNode.fontSize !== 18) {
                  textNode.fontSize = 18;
                }
                if (textNode.width !== 452) {
                  textNode.resize(452, textNode.height);
                }
              }

              // Update content (format as bullets if needed)
              let contentText = section.content || "—";
              if (section.isBulletList && contentText && contentText !== "—") {
                const lines = contentText.split("\n").filter((l: string) => l.trim());
                contentText = lines.map((l: string) => l.startsWith("•") ? l : `• ${l.trim()}`).join("\n");
              }
              textNode.characters = contentText;
            }

            // Find or create footer
            let footerFrame = problemFrame.findOne((node) =>
              node.name === "PF__Footer_Section" && node.type === "FRAME"
            ) as FrameNode | null;

            if (!footerFrame) {
              footerFrame = figma.createFrame();
              footerFrame.name = "PF__Footer_Section";
              footerFrame.layoutMode = "VERTICAL";
              footerFrame.paddingLeft = 0;
              footerFrame.paddingRight = 0;
              footerFrame.paddingTop = 8;
              footerFrame.paddingBottom = 0;
              footerFrame.itemSpacing = 0;
              footerFrame.primaryAxisSizingMode = "AUTO";
              footerFrame.counterAxisSizingMode = "FIXED";
              footerFrame.counterAxisAlignItems = "MIN";
              footerFrame.layoutAlign = "STRETCH";
              footerFrame.fills = [];
              footerFrame.strokes = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];
              footerFrame.strokeWeight = 1;
              footerFrame.strokeAlign = "INSIDE";
              footerFrame.strokeTopWeight = 1;
              footerFrame.strokeBottomWeight = 0;
              footerFrame.strokeLeftWeight = 0;
              footerFrame.strokeRightWeight = 0;

              const footerNode = figma.createText();
              footerNode.name = "PF__Footer";
              footerNode.characters = "This frame captures the problem as understood at the start of design. It may evolve.";
              footerNode.fontName = { family: "Inter", style: "Regular" };
              footerNode.fontSize = 14;
              footerNode.lineHeight = { value: 150, unit: "PERCENT" };
              footerNode.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
              footerNode.resize(452, 24);
              footerNode.textAutoResize = "HEIGHT";
              footerFrame.appendChild(footerNode);

              problemFrame.appendChild(footerFrame);
            }

            // Save the values to pluginData
            data.problem = msg.problem || "";
            data.whyNow = msg.whyNow || "";
            data.metricOrRisk = msg.metricOrRisk || "";
            data.nonGoals = msg.nonGoals || "";
            savePluginData(data);

            if (figma.ui && uiOpen && messageHandlerSetup) {
              figma.ui.postMessage({
                type: "problem-frame-updated",
                frameName: problemFrame.name,
              });
              sendStateToUI();
            }
          } catch (e) {
            if (figma.ui && uiOpen && messageHandlerSetup) {
              figma.ui.postMessage({
                type: "problem-frame-error",
                message: "Error updating Problem Frame: " + (e instanceof Error ? e.message : "Unknown error"),
              });
            }
          }
          break;
        }

        case "open-view-for-frame": {
          // Select the frame and send selection
          const frame = figma.getNodeById(msg.frameId);
          if (frame && frame.type === "FRAME") {
            figma.currentPage.selection = [frame];
            if (uiOpen && figma.ui && messageHandlerSetup) {
              sendSelectionToUI();
            }
          }
          break;
        }
      }
    };
    messageHandlerSetup = true;
  } catch (error) {
    // Silently handle setup errors
  }
}

// Handle selection changes - show UI when frame with rationales is selected
figma.on("selectionchange", () => {
  const frames = getSelectedFrames();
  
  // If exactly one frame is selected and it has rationales, ensure its indicator
  if (frames.length === 1 && frameHasRationales(frames[0].id)) {
    ensureIndicatorInFrame(frames[0]).catch(() => {});
  }
  
  // Always send selection and state updates
  if (uiOpen && figma.ui && messageHandlerSetup) {
    setTimeout(() => {
      sendSelectionToUI();
    }, 100);
  }
});

// Initialize - show UI immediately (required for plugin to load)
console.log("Plugin initialized");
figma.showUI(__html__, { width: 400, height: 600 });
uiOpen = true;
setupUIMessageHandler();
// Ensure indicators for currently selected frames on startup
setTimeout(() => {
  const frames = getSelectedFrames();
  if (frames.length === 1 && frameHasRationales(frames[0].id)) {
    ensureIndicatorInFrame(frames[0]).catch(() => {});
  }
}, 200);
