
(() => {
  "use strict";

  // =====================================================
  // CONFIG
  // =====================================================

  const API_BASE =
    window.CKTSAGE_CONFIG?.API_BASE ||
    "https://cktsage-backend.onrender.com";

  const AUTH_KEY =
    "cktsage-auth";

  // =====================================================
  // AUTH
  // =====================================================

  let auth = null;

  try {
    auth =
      JSON.parse(
        localStorage.getItem(
          AUTH_KEY
        ) || "null"
      );
  } catch (error) {
    auth = null;
  }
  // Guest mode: pages remain accessible without signing in.
const TOKEN =
    auth?.access_token || "";

  // =====================================================
  // ELEMENTS
  // =====================================================

  const shell =
    document.getElementById(
      "simulation-shell"
    );

  const sidebarToggle =
    document.getElementById(
      "mobile-toggle"
    );

  const sidebarScrim =
    document.getElementById(
      "sidebar-scrim"
    );

  const userName =
    document.getElementById(
      "sidebar-user-name"
    );

  const uploadZone =
    document.getElementById(
      "upload-zone"
    );

  const fileInput =
    document.getElementById(
      "simulation-file"
    );

  const chooseFile =
    document.getElementById(
      "choose-file"
    );

  const removeFile =
    document.getElementById(
      "remove-file"
    );

  const selectedFileBox =
    document.getElementById(
      "selected-circuit-file"
    );

  const selectedFileName =
    document.getElementById(
      "selected-file-name"
    );

  const selectedFileMeta =
    document.getElementById(
      "selected-file-meta"
    );

  const filePreviewIcon =
    document.getElementById(
      "file-preview-icon"
    );

  const imagePreview =
    document.getElementById(
      "image-preview"
    );

  const uploadStatusBadge =
    document.getElementById(
      "upload-status-badge"
    );

  const analyzeButton =
    document.getElementById(
      "analyze-button"
    ) ||
    document.getElementById(
      "simulate-button"
    );

  const simulationStatus =
    document.getElementById(
      "simulation-status"
    );

  const detectedCard =
    document.getElementById(
      "detected-card"
    );

  const netlistOutput =
    document.getElementById(
      "netlist-output"
    );

  const circuitDescription =
    document.getElementById(
      "circuit-description"
    );

  const workingPrinciple =
    document.getElementById(
      "working-principle"
    );

  const componentTableBody =
    document.getElementById(
      "component-table-body"
    );

  const summaryCircuitName =
    document.getElementById(
      "summary-circuit-name"
    );

  const summaryComponentCount =
    document.getElementById(
      "summary-component-count"
    );

  const summaryInput =
    document.getElementById(
      "summary-input"
    );

  const summaryOutput =
    document.getElementById(
      "summary-output"
    );

  const powerSourceList =
    document.getElementById(
      "power-source-list"
    );

  const warningList =
    document.getElementById(
      "warning-list"
    );

  // =====================================================
  // USER
  // =====================================================

  if (userName) {
    userName.textContent =
      auth?.user?.name?.trim() ||
      "User";
  }

  // =====================================================
  // STATE
  // =====================================================

  let selectedFile = null;

  let recognizedCircuit = null;

  let imagePreviewUrl = null;

  // =====================================================
  // HELPERS
  // =====================================================

  function setStatus(
    message = "",
    isError = false
  ) {
    if (!simulationStatus) {
      return;
    }

    simulationStatus.textContent =
      message;

    simulationStatus.classList.toggle(
      "error",
      Boolean(isError)
    );
  }

  function formatBytes(
    bytes
  ) {
    if (
      !Number.isFinite(bytes) ||
      bytes <= 0
    ) {
      return "0 B";
    }

    const units = [
      "B",
      "KB",
      "MB",
      "GB"
    ];

    const index =
      Math.min(
        Math.floor(
          Math.log(bytes) /
          Math.log(1024)
        ),
        units.length - 1
      );

    const value =
      bytes /
      Math.pow(
        1024,
        index
      );

    return (
      `${value.toFixed(
        index === 0 ? 0 : 1
      )} ${units[index]}`
    );
  }

  function getExtension(
    fileName
  ) {
    const value =
      String(
        fileName || ""
      );

    if (!value.includes(".")) {
      return "";
    }

    return value
      .split(".")
      .pop()
      .toLowerCase();
  }

  function getFileIcon(
    file
  ) {
    if (
      file.type &&
      file.type.startsWith(
        "image/"
      )
    ) {
      return "🖼";
    }

    if (
      getExtension(
        file.name
      ) === "pdf"
    ) {
      return "📕";
    }

    return "📄";
  }

  function validFile(
    file
  ) {
    if (!file) {
      return false;
    }

    const extension =
      getExtension(
        file.name
      );

    const allowed = [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "pdf",
      "txt",
      "md",
      "json",
      "cir",
      "sp",
      "net"
    ];

    return (
      (
        file.type &&
        file.type.startsWith(
          "image/"
        )
      ) ||
      allowed.includes(
        extension
      )
    );
  }

  function textValue(
    value,
    fallback = ""
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    const text =
      String(value).trim();

    return text || fallback;
  }

  function escapeHtml(
    value
  ) {
    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  function equationHtml(
    equation
  ) {
    const formula =
      textValue(
        equation
      );

    if (!formula) {
      return "";
    }

    return `
      <div class="analysis-equation">
        \\[
          ${escapeHtml(formula)}
        \\]
      </div>
    `;
  }

  async function typesetMath(
    element
  ) {
    if (!element) {
      return;
    }

    try {

      if (
        window.MathJax?.typesetPromise
      ) {

        if (
          window.MathJax.typesetClear
        ) {
          window.MathJax.typesetClear(
            [element]
          );
        }

        await window.MathJax.typesetPromise(
          [element]
        );

        return;
      }

      let attempts = 0;

      const timer =
        window.setInterval(
          () => {

            attempts += 1;

            if (
              window.MathJax?.typesetPromise
            ) {

              window.clearInterval(
                timer
              );

              if (
                window.MathJax.typesetClear
              ) {
                window.MathJax.typesetClear(
                  [element]
                );
              }

              window.MathJax
                .typesetPromise(
                  [element]
                )
                .catch(
                  error => {
                    console.error(
                      "MathJax rendering error:",
                      error
                    );
                  }
                );
            }

            if (
              attempts >= 40
            ) {
              window.clearInterval(
                timer
              );
            }

          },
          100
        );

    } catch (error) {

      console.error(
        "MathJax rendering error:",
        error
      );
    }
  }

  // =====================================================
  // SELECT FILE
  // =====================================================

  function setSelectedFile(
    file
  ) {
    if (!validFile(file)) {
      setStatus(
        "Unsupported file. Use an image, PDF or circuit/netlist file.",
        true
      );

      return;
    }

    if (
      file.size >
      15 * 1024 * 1024
    ) {
      setStatus(
        "File is too large. Maximum size is 15 MB.",
        true
      );

      return;
    }

    selectedFile =
      file;

    recognizedCircuit =
      null;

    if (detectedCard) {
      detectedCard.hidden =
        true;
    }

    if (selectedFileName) {
      selectedFileName.textContent =
        file.name;
    }

    if (selectedFileMeta) {
      selectedFileMeta.textContent =
        `${formatBytes(file.size)} · ${
          file.type ||
          getExtension(
            file.name
          ).toUpperCase()
        }`;
    }

    if (selectedFileBox) {
      selectedFileBox.hidden =
        false;
    }

    if (uploadStatusBadge) {
      uploadStatusBadge.textContent =
        "Selected";

      uploadStatusBadge.classList.add(
        "ready"
      );
    }

    if (filePreviewIcon) {
      filePreviewIcon.textContent =
        getFileIcon(file);
    }

    if (
      file.type &&
      file.type.startsWith(
        "image/"
      )
    ) {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(
          imagePreviewUrl
        );
      }

      imagePreviewUrl =
        URL.createObjectURL(
          file
        );

      if (imagePreview) {
        imagePreview.src =
          imagePreviewUrl;

        imagePreview.hidden =
          false;
      }

      if (filePreviewIcon) {
        filePreviewIcon.hidden =
          true;
      }

    } else {

      if (imagePreview) {
        imagePreview.hidden =
          true;
      }

      if (filePreviewIcon) {
        filePreviewIcon.hidden =
          false;
      }
    }

    setStatus(
      "Circuit file ready for analysis."
    );
  }

  // =====================================================
  // CLEAR FILE
  // =====================================================

  function clearFile() {
    selectedFile =
      null;

    recognizedCircuit =
      null;

    if (fileInput) {
      fileInput.value =
        "";
    }

    if (selectedFileBox) {
      selectedFileBox.hidden =
        true;
    }

    if (detectedCard) {
      detectedCard.hidden =
        true;
    }

    if (uploadStatusBadge) {
      uploadStatusBadge.textContent =
        "Waiting";

      uploadStatusBadge.classList.remove(
        "ready"
      );
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(
        imagePreviewUrl
      );

      imagePreviewUrl =
        null;
    }

    if (imagePreview) {
      imagePreview.removeAttribute(
        "src"
      );

      imagePreview.hidden =
        true;
    }

    if (filePreviewIcon) {
      filePreviewIcon.hidden =
        false;
    }

    setStatus("");
  }

  // =====================================================
  // LOAD LIBRARY FILE
  // =====================================================

  async function loadLibraryFile() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const libraryItemId =
      params.get(
        "library_item_id"
      );

    if (!libraryItemId) {
      return;
    }

    setStatus(
      "Loading circuit from Library..."
    );

    if (uploadStatusBadge) {
      uploadStatusBadge.textContent =
        "Loading";
    }

    try {

      const response =
        await fetch(
          `${API_BASE}/library/${encodeURIComponent(
            libraryItemId
          )}/file`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${TOKEN}`
            }
          }
        );

      if (
        response.status === 401
      ) {
        throw new Error(
          "Your login was rejected. Please sign in again."
        );
      }

      if (!response.ok) {

        let message =
          `Could not load Library file (${response.status}).`;

        try {

          const data =
            await response.json();

          message =
            data?.detail ||
            data?.message ||
            message;

        } catch (error) {
          // Keep default.
        }

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      let fileName =
        `library-circuit-${libraryItemId}`;

      const disposition =
        response.headers.get(
          "content-disposition"
        );

      if (disposition) {

        const utfMatch =
          disposition.match(
            /filename\*=UTF-8''([^;]+)/i
          );

        const normalMatch =
          disposition.match(
            /filename="?([^";]+)"?/i
          );

        if (
          utfMatch &&
          utfMatch[1]
        ) {
          fileName =
            decodeURIComponent(
              utfMatch[1]
            );

        } else if (
          normalMatch &&
          normalMatch[1]
        ) {
          fileName =
            normalMatch[1];
        }
      }

      if (
        !fileName.includes(".")
      ) {

        if (
          blob.type ===
          "application/pdf"
        ) {
          fileName += ".pdf";

        } else if (
          blob.type ===
          "image/png"
        ) {
          fileName += ".png";

        } else if (
          blob.type ===
          "image/jpeg"
        ) {
          fileName += ".jpg";

        } else if (
          blob.type ===
          "image/webp"
        ) {
          fileName += ".webp";

        } else {
          fileName += ".txt";
        }
      }

      const file =
        new File(
          [blob],
          fileName,
          {
            type:
              blob.type ||
              "application/octet-stream"
          }
        );

      setSelectedFile(
        file
      );

      setStatus(
        "Circuit loaded from Library. Press Analyze circuit."
      );

    } catch (error) {

      console.error(
        "Library circuit load error:",
        error
      );

      if (uploadStatusBadge) {
        uploadStatusBadge.textContent =
          "Error";

        uploadStatusBadge.classList.remove(
          "ready"
        );
      }

      setStatus(
        error.message ||
        "Could not load the circuit from Library.",
        true
      );
    }
  }

  // =====================================================
  // RECOGNITION API
  // =====================================================

  async function recognizeCircuit() {

    if (!selectedFile) {
      throw new Error(
        "Choose a circuit image or file first."
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      selectedFile
    );

    let response;

    try {

      response =
        await fetch(
          `${API_BASE}/simulation/recognize`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${TOKEN}`
            },

            body:
              formData
          }
        );

    } catch (error) {

      console.error(
        "Simulation fetch error:",
        error
      );

      throw new Error(
        "Could not reach the circuit-analysis endpoint."
      );
    }

    let rawText = "";

    try {
      rawText =
        await response.text();
    } catch (error) {
      rawText = "";
    }

    let data = null;

    if (rawText) {

      try {
        data =
          JSON.parse(
            rawText
          );
      } catch (error) {
        data = null;
      }
    }

    console.log(
      "Circuit analysis status:",
      response.status
    );

    console.log(
      "Circuit analysis response:",
      rawText
    );

    if (
      response.status === 401
    ) {
      throw new Error(
        "Authentication was rejected by the backend."
      );
    }

    if (!response.ok) {

      let detail =
        data?.detail ||
        data?.message ||
        rawText;

      if (
        Array.isArray(detail)
      ) {
        detail =
          detail
            .map(
              item =>
                item?.msg ||
                JSON.stringify(
                  item
                )
            )
            .join(", ");
      }

      throw new Error(
        detail ||
        `Circuit analysis failed (${response.status}).`
      );
    }

    if (
      !data ||
      !data.circuit
    ) {
      throw new Error(
        "Backend did not return circuit information."
      );
    }

    return data.circuit;
  }

  // =====================================================
  // COMPONENT TABLE
  // =====================================================

  function renderComponentTable(
    components
  ) {

    if (!componentTableBody) {
      return;
    }

    componentTableBody.innerHTML =
      "";

    if (
      !Array.isArray(
        components
      ) ||
      !components.length
    ) {

      componentTableBody.innerHTML =
        `
          <tr>
            <td colspan="5" class="empty-cell">
              No components were confidently detected.
            </td>
          </tr>
        `;

      return;
    }

    components.forEach(
      component => {

        const row =
          document.createElement(
            "tr"
          );

        const confidence =
          Number(
            component.confidence
          );

        const confidenceText =
          Number.isFinite(
            confidence
          )
            ? `${Math.round(
                confidence * 100
              )}%`
            : "—";

        const nodes =
          Array.isArray(
            component.nodes
          )
            ? component.nodes.join(
                ", "
              )
            : "—";

        const values = [
          component.id ||
            "—",

          component.type ||
            "unknown",

          component.value ??
            "Unreadable",

          nodes ||
            "—",

          confidenceText
        ];

        values.forEach(
          value => {

            const cell =
              document.createElement(
                "td"
              );

            cell.textContent =
              String(value);

            row.appendChild(
              cell
            );
          }
        );

        componentTableBody.appendChild(
          row
        );
      }
    );
  }

  // =====================================================
  // BUILD DETAILED EXPLANATION
  // =====================================================

  function buildDetailedExplanation(
    circuit
  ) {

    const analysis =
      circuit.analysis &&
      typeof circuit.analysis ===
        "object"
        ? circuit.analysis
        : {};

    const lines = [];

    const overview =
      textValue(
        analysis.overview,
        circuit.description || ""
      );

    if (overview) {
      lines.push(
        "OVERVIEW"
      );

      lines.push(
        overview
      );

      lines.push("");
    }

    const principle =
      textValue(
        analysis.working_principle,
        circuit.working_principle || ""
      );

    if (principle) {
      lines.push(
        "WORKING PRINCIPLE"
      );

      lines.push(
        principle
      );

      lines.push("");
    }

    const roles =
      Array.isArray(
        analysis.component_roles
      )
        ? analysis.component_roles
        : [];

    if (roles.length) {

      lines.push(
        "COMPONENT ROLES"
      );

      roles.forEach(
        item => {

          if (
            !item ||
            typeof item !==
              "object"
          ) {
            return;
          }

          const component =
            textValue(
              item.component,
              "Component"
            );

          const role =
            textValue(
              item.role
            );

          if (role) {
            lines.push(
              `${component}: ${role}`
            );
          }
        }
      );

      lines.push("");
    }

    const signalFlow =
      textValue(
        analysis.signal_flow
      );

    if (signalFlow) {
      lines.push(
        "SIGNAL FLOW"
      );

      lines.push(
        signalFlow
      );

      lines.push("");
    }

    const inputBehavior =
      textValue(
        analysis.input_behavior
      );

    if (inputBehavior) {
      lines.push(
        "INPUT BEHAVIOR"
      );

      lines.push(
        inputBehavior
      );

      lines.push("");
    }

    const outputBehavior =
      textValue(
        analysis.output_behavior
      );

    if (outputBehavior) {
      lines.push(
        "OUTPUT BEHAVIOR"
      );

      lines.push(
        outputBehavior
      );

      lines.push("");
    }

    const applications =
      Array.isArray(
        analysis.applications
      )
        ? analysis.applications
        : [];

    if (applications.length) {

      lines.push(
        "APPLICATIONS"
      );

      applications.forEach(
        application => {
          lines.push(
            `• ${application}`
          );
        }
      );

      lines.push("");
    }

    const designNotes =
      Array.isArray(
        analysis.design_notes
      )
        ? analysis.design_notes
        : [];

    if (designNotes.length) {

      lines.push(
        "DESIGN NOTES"
      );

      designNotes.forEach(
        note => {
          lines.push(
            `• ${note}`
          );
        }
      );

      lines.push("");
    }

    return lines
      .join("\n")
      .trim();
  }

  // =====================================================
  // BUILD RICH DETAILED ANALYSIS
  // =====================================================

  function buildDetailedAnalysisHtml(
    circuit
  ) {

    const analysis =
      circuit.analysis &&
      typeof circuit.analysis ===
        "object"
        ? circuit.analysis
        : {};

    const sections = [];

    const overview =
      textValue(
        analysis.overview,
        circuit.description || ""
      );

    if (overview) {
      sections.push(`
        <div class="analysis-text-section">
          <strong>OVERVIEW</strong>
          <p>${escapeHtml(overview)}</p>
        </div>
      `);
    }

    const principle =
      textValue(
        analysis.working_principle,
        circuit.working_principle || ""
      );

    if (principle) {
      sections.push(`
        <div class="analysis-text-section">
          <strong>WORKING PRINCIPLE</strong>
          <p>${escapeHtml(principle)}</p>
        </div>
      `);
    }

    const roles =
      Array.isArray(
        analysis.component_roles
      )
        ? analysis.component_roles
        : [];

    if (roles.length) {

      const roleHtml =
        roles
          .map(
            item => {

              if (
                !item ||
                typeof item !==
                  "object"
              ) {
                return "";
              }

              const component =
                textValue(
                  item.component,
                  "Component"
                );

              const role =
                textValue(
                  item.role
                );

              if (!role) {
                return "";
              }

              return `
                <p>
                  <b>${escapeHtml(component)}:</b>
                  ${escapeHtml(role)}
                </p>
              `;
            }
          )
          .join("");

      sections.push(`
        <div class="analysis-text-section">
          <strong>COMPONENT ROLES</strong>
          ${roleHtml}
        </div>
      `);
    }

    const signalFlow =
      textValue(
        analysis.signal_flow
      );

    if (signalFlow) {
      sections.push(`
        <div class="analysis-text-section">
          <strong>SIGNAL FLOW</strong>
          <p>${escapeHtml(signalFlow)}</p>
        </div>
      `);
    }

    const inputBehavior =
      textValue(
        analysis.input_behavior
      );

    if (inputBehavior) {
      sections.push(`
        <div class="analysis-text-section">
          <strong>INPUT BEHAVIOR</strong>
          <p>${escapeHtml(inputBehavior)}</p>
        </div>
      `);
    }

    const outputBehavior =
      textValue(
        analysis.output_behavior
      );

    if (outputBehavior) {
      sections.push(`
        <div class="analysis-text-section">
          <strong>OUTPUT BEHAVIOR</strong>
          <p>${escapeHtml(outputBehavior)}</p>
        </div>
      `);
    }

    const equations =
      Array.isArray(
        analysis.important_equations
      )
        ? analysis.important_equations
        : [];

    if (equations.length) {

      const equationBlocks =
        equations
          .map(
            equation => {

              if (
                typeof equation ===
                "string"
              ) {
                return equationHtml(
                  equation
                );
              }

              if (
                !equation ||
                typeof equation !==
                  "object"
              ) {
                return "";
              }

              const name =
                textValue(
                  equation.name
                );

              const formula =
                textValue(
                  equation.equation
                );

              const explanation =
                textValue(
                  equation.explanation
                );

              return `
                <div class="analysis-equation-block">

                  ${
                    name
                      ? `<b>${escapeHtml(name)}</b>`
                      : ""
                  }

                  ${
                    formula
                      ? equationHtml(formula)
                      : ""
                  }

                  ${
                    explanation
                      ? `<p>${escapeHtml(explanation)}</p>`
                      : ""
                  }

                </div>
              `;
            }
          )
          .join("");

      sections.push(`
        <div class="analysis-text-section">
          <strong>IMPORTANT EQUATIONS</strong>
          ${equationBlocks}
        </div>
      `);
    }

    const applications =
      Array.isArray(
        analysis.applications
      )
        ? analysis.applications
        : [];

    if (applications.length) {

      const items =
        applications
          .map(
            item =>
              `<li>${escapeHtml(item)}</li>`
          )
          .join("");

      sections.push(`
        <div class="analysis-text-section">
          <strong>APPLICATIONS</strong>
          <ul>
            ${items}
          </ul>
        </div>
      `);
    }

    const designNotes =
      Array.isArray(
        analysis.design_notes
      )
        ? analysis.design_notes
        : [];

    if (designNotes.length) {

      const items =
        designNotes
          .map(
            item =>
              `<li>${escapeHtml(item)}</li>`
          )
          .join("");

      sections.push(`
        <div class="analysis-text-section">
          <strong>DESIGN NOTES</strong>
          <ul>
            ${items}
          </ul>
        </div>
      `);
    }

    return sections.join("");
  }

  // =====================================================
  // DISPLAY CIRCUIT
  // =====================================================

  function displayCircuit(
    circuit
  ) {

    const components =
      Array.isArray(
        circuit.components
      )
        ? circuit.components
        : [];

    const analysis =
      circuit.analysis &&
      typeof circuit.analysis ===
        "object"
        ? circuit.analysis
        : {};

    if (summaryCircuitName) {
      summaryCircuitName.textContent =
        circuit.circuit_name ||
        "Detected circuit";
    }

    if (summaryComponentCount) {
      summaryComponentCount.textContent =
        String(
          components.length
        );
    }

    if (summaryInput) {
      summaryInput.textContent =
        circuit.input_node ||
        "Not identified";
    }

    if (summaryOutput) {
      summaryOutput.textContent =
        circuit.output_node ||
        "Not identified";
    }

    if (circuitDescription) {

      circuitDescription.textContent =
        analysis.overview ||
        circuit.description ||
        "Circuit detected successfully.";
    }

    if (workingPrinciple) {

      workingPrinciple.textContent =
        analysis.working_principle ||
        circuit.working_principle ||
        circuit.explanation ||
        circuit.description ||
        "Detailed circuit explanation is not available.";
    }

    // ===================================================
    // POWER SOURCES
    // ===================================================

    const powerSources =
      Array.isArray(
        circuit.power_sources
      )
        ? circuit.power_sources
        : [];

    if (powerSourceList) {

      powerSourceList.innerHTML =
        "";

      if (
        !powerSources.length
      ) {

        powerSourceList.textContent =
          "No power source was confidently identified.";

      } else {

        powerSources.forEach(
          source => {

            const item =
              document.createElement(
                "div"
              );

            item.className =
              "info-item";

            let text =
              `${
                source.id ||
                "Source"
              } — ${
                source.type ||
                "power source"
              } — ${
                source.value ??
                "value unreadable"
              }`;

            if (
              source.positive_node ||
              source.negative_node
            ) {

              text +=
                ` — ${source.positive_node || "?"} to ${source.negative_node || "?"}`;
            }

            item.textContent =
              text;

            powerSourceList.appendChild(
              item
            );
          }
        );
      }
    }

    // ===================================================
    // WARNINGS
    // ===================================================

    const warnings =
      Array.isArray(
        circuit.warnings
      )
        ? circuit.warnings
        : [];

    const uncertain =
      Array.isArray(
        circuit.uncertain_items
      )
        ? circuit.uncertain_items
        : [];

    if (warningList) {

      warningList.innerHTML =
        "";

      const allItems = [
        ...warnings,
        ...uncertain
      ];

      if (!allItems.length) {

        warningList.textContent =
          "No major uncertainty reported.";

      } else {

        allItems.forEach(
          item => {

            const element =
              document.createElement(
                "div"
              );

            element.className =
              "warning-item";

            element.textContent =
              typeof item === "string"
                ? item
                : JSON.stringify(
                    item
                  );

            warningList.appendChild(
              element
            );
          }
        );
      }
    }

    // ===================================================
    // COMPONENT TABLE
    // ===================================================

    renderComponentTable(
      components
    );

    // ===================================================
    // DETECTED STRUCTURE + DETAILED ANALYSIS
    // ===================================================

    if (netlistOutput) {

      const componentLines =
        components
          .map(
            component => {

              const nodes =
                Array.isArray(
                  component.nodes
                )
                  ? component.nodes.join(
                      ", "
                    )
                  : "";

              return `${
                component.id ||
                "?"
              } | ${
                component.type ||
                "unknown"
              } | ${
                component.value ??
                "value unreadable"
              } | ${
                nodes ||
                "nodes unknown"
              }`;
            }
          )
          .join("\n");

      const description =
        circuit.description
          ? `
            <div class="analysis-text-section">
              <strong>DESCRIPTION</strong>
              <p>
                ${escapeHtml(
                  circuit.description
                )}
              </p>
            </div>
          `
          : "";

      const detailedHtml =
        buildDetailedAnalysisHtml(
          circuit
        );

      /*
       * The original element is a <pre>.
       * Change its presentation so rich HTML and MathJax
       * can render correctly while keeping the same ID.
       */

      netlistOutput.style.whiteSpace =
        "normal";

      netlistOutput.innerHTML =
        `
          <div class="detected-structure-content">

            <div class="analysis-text-section">

              <p>
                <b>Circuit:</b>
                ${escapeHtml(
                  circuit.circuit_name ||
                  "Detected circuit"
                )}
              </p>

            </div>

            ${description}

            <div class="analysis-text-section">

              <strong>COMPONENTS</strong>

              <pre style="white-space: pre-wrap; margin: 12px 0 0;">${escapeHtml(
                componentLines ||
                "No components were confidently detected."
              )}</pre>

            </div>

            ${
              detailedHtml
                ? `
                  <div class="detailed-analysis-heading">
                    DETAILED CIRCUIT ANALYSIS
                  </div>

                  ${detailedHtml}
                `
                : ""
            }

          </div>
        `;

      typesetMath(
        netlistOutput
      );
    }

    if (detectedCard) {
      detectedCard.hidden =
        false;
    }

    typesetMath(
      detectedCard
    );
  }

  // =====================================================
  // FILE PICKER
  // =====================================================

  chooseFile?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      fileInput?.click();
    }
  );

  uploadZone?.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          "#choose-file"
        )
      ) {
        return;
      }

      fileInput?.click();
    }
  );

  uploadZone?.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        fileInput?.click();
      }
    }
  );

  fileInput?.addEventListener(
    "change",
    () => {

      const file =
        fileInput.files?.[0];

      if (file) {
        setSelectedFile(
          file
        );
      }
    }
  );

  removeFile?.addEventListener(
    "click",
    clearFile
  );

  // =====================================================
  // DRAG & DROP
  // =====================================================

  [
    "dragenter",
    "dragover"
  ].forEach(
    eventName => {

      uploadZone?.addEventListener(
        eventName,
        event => {

          event.preventDefault();

          uploadZone.classList.add(
            "dragging"
          );
        }
      );
    }
  );

  [
    "dragleave",
    "drop"
  ].forEach(
    eventName => {

      uploadZone?.addEventListener(
        eventName,
        event => {

          event.preventDefault();

          uploadZone.classList.remove(
            "dragging"
          );
        }
      );
    }
  );

  uploadZone?.addEventListener(
    "drop",
    event => {

      const file =
        event
          .dataTransfer
          ?.files?.[0];

      if (file) {
        setSelectedFile(
          file
        );
      }
    }
  );

  // =====================================================
  // ANALYZE BUTTON
  // =====================================================

  analyzeButton?.addEventListener(
    "click",
    async () => {

      if (!selectedFile) {

        setStatus(
          "Choose a circuit image or file first.",
          true
        );

        return;
      }

      analyzeButton.disabled =
        true;

      analyzeButton.innerHTML =
        "<span>⚡</span> Analyzing circuit…";

      if (uploadStatusBadge) {
        uploadStatusBadge.textContent =
          "Analyzing";
      }

      setStatus(
        "CKTSage is identifying the circuit and preparing a detailed engineering explanation..."
      );

      try {

        recognizedCircuit =
          await recognizeCircuit();

        displayCircuit(
          recognizedCircuit
        );

        if (uploadStatusBadge) {

          uploadStatusBadge.textContent =
            "Analyzed";

          uploadStatusBadge.classList.add(
            "ready"
          );
        }

        setStatus(
          "Circuit recognition and detailed analysis completed successfully."
        );

        detectedCard?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      } catch (error) {

        console.error(
          "Circuit analysis error:",
          error
        );

        if (uploadStatusBadge) {
          uploadStatusBadge.textContent =
            "Selected";
        }

        setStatus(
          error.message ||
          "Circuit analysis failed.",
          true
        );

      } finally {

        analyzeButton.disabled =
          false;

        analyzeButton.innerHTML =
          "<span>⚡</span> Analyze circuit";
      }
    }
  );

  // =====================================================
  // RESULT TABS
  // =====================================================

  const tabs =
    document.querySelectorAll(
      ".result-tab"
    );

  const views = {
    circuit:
      document.getElementById(
        "view-circuit"
      ),

    graphs:
      document.getElementById(
        "view-graphs"
      ),

    table:
      document.getElementById(
        "view-table"
      )
  };

  tabs.forEach(
    tab => {

      tab.addEventListener(
        "click",
        () => {

          const target =
            tab.dataset.view;

          tabs.forEach(
            item => {

              item.classList.remove(
                "active"
              );
            }
          );

          Object.values(
            views
          ).forEach(
            view => {

              view?.classList.remove(
                "active"
              );
            }
          );

          tab.classList.add(
            "active"
          );

          views[target]
            ?.classList.add(
              "active"
            );
        }
      );
    }
  );

  // =====================================================
  // SIDEBAR
  // =====================================================

  sidebarToggle?.addEventListener(
    "click",
    () => {

      const mobile =
        window.matchMedia(
          "(max-width: 760px)"
        ).matches;

      if (mobile) {

        shell?.classList.toggle(
          "sidebar-open"
        );

      } else {

        shell?.classList.toggle(
          "sidebar-collapsed"
        );
      }
    }
  );

  sidebarScrim?.addEventListener(
    "click",
    () => {

      shell?.classList.remove(
        "sidebar-open"
      );
    }
  );

  // =====================================================
  // INITIALIZE
  // =====================================================

  loadLibraryFile();

})();
