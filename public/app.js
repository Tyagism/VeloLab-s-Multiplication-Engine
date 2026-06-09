/**
 * VeloLab's Multiplication Engine Front-end Logic
 * Coordinates UI tabs, APIs, step-by-step visualizers, and benchmarks.
 */

// Global State
let num1 = "";
let num2 = "";
let traceData = null;
let currentMode = "urdhva"; // urdhva, schoolbook, nikhilam
let currentStep = 0;
let isPlaying = false;
let playInterval = null;
let playSpeed = 1000; // ms per step

// Chart instances
let timeChart = null;
let memoryChart = null;
let opsChart = null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initInputs();
    initButtons();
    initVisualizerControls();
    
    // Initial UI state setup
    updateDigitCount("num1");
    updateDigitCount("num2");

    // Dynamic resizing handler for visualizer drawing coordinates
    window.addEventListener("resize", () => {
        if (traceData) {
            renderStep();
        }
    });
});

// Tab Navigation Logic
function initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");
    
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.target;
            
            // Switch tabs
            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(target).classList.add("active");
            
            // Adjust visualization lines if switching back to visualizer
            if (target === "panel-visualizer" && traceData) {
                // Redraw line overlays after tab rendering completes
                setTimeout(renderStep, 100);
            }
        });
    });
}

// Input Character Counting and Resizing
function initInputs() {
    const num1Input = document.getElementById("num1-input");
    const num2Input = document.getElementById("num2-input");
    
    num1Input.addEventListener("input", () => {
        updateDigitCount("num1");
        num1Input.value = num1Input.value.replace(/[^0-9]/g, ""); // allow only numbers
    });
    
    num2Input.addEventListener("input", () => {
        updateDigitCount("num2");
        num2Input.value = num2Input.value.replace(/[^0-9]/g, ""); // allow only numbers
    });
}

function updateDigitCount(id) {
    const input = document.getElementById(`${id}-input`);
    const counter = document.getElementById(`${id}-counter`);
    const len = input.value.trim().length;
    counter.textContent = `${len} digit${len !== 1 ? 's' : ''}`;
}

// Buttons Event Handlers
function initButtons() {
    const calcBtn = document.getElementById("calculate-btn");
    const genRandomBtn = document.getElementById("gen-random-btn");
    const genFactorialBtn = document.getElementById("gen-factorial-btn");
    const genNikhilamBtn = document.getElementById("gen-nikhilam-btn");
    const genSizeVal = document.getElementById("gen-size-val");
    const runBenchBtn = document.getElementById("run-bench-btn");
    
    // Close modal click handlers
    document.getElementById("modal-close-btn").addEventListener("click", closeModal);
    window.addEventListener("click", (e) => {
        if (e.target === document.getElementById("result-modal")) {
            closeModal();
        }
    });

    // Generate Inputs
    genRandomBtn.addEventListener("click", () => generateNumbers("random", genSizeVal.value));
    genFactorialBtn.addEventListener("click", () => generateNumbers("factorial", genSizeVal.value));
    genNikhilamBtn.addEventListener("click", () => generateNumbers("nikhilam", genSizeVal.value));
    document.getElementById("gen-ekadhikena-btn").addEventListener("click", () => generateNumbers("ekadhikena", genSizeVal.value));
    document.getElementById("gen-ekanyunena-btn").addEventListener("click", () => generateNumbers("ekanyunena", genSizeVal.value));
    
    // Compare
    calcBtn.addEventListener("click", runMultiplication);
    
    // Benchmark
    runBenchBtn.addEventListener("click", runBenchmarkSuite);
}

// Generate Inputs from API
async function generateNumbers(type, val) {
    const genRandomBtn = document.getElementById("gen-random-btn");
    const originalText = genRandomBtn.innerHTML;
    
    try {
        setLoadingState(true);
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, value: val })
        });
        
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        
        document.getElementById("num1-input").value = data.num1;
        document.getElementById("num2-input").value = data.num2;
        updateDigitCount("num1");
        updateDigitCount("num2");
        
    } catch (e) {
        console.error(e);
        alert("Failed to connect to backend server. Make sure server.py is running.");
    } finally {
        setLoadingState(false);
    }
}

// Perform Multiplication and Update Metrics
async function runMultiplication() {
    num1 = document.getElementById("num1-input").value.trim();
    num2 = document.getElementById("num2-input").value.trim();
    
    if (!num1 || !num2) {
        alert("Please enter or generate two numbers first.");
        return;
    }
    
    const container = document.getElementById("metrics-grid-container");
    container.innerHTML = `
        <div class="no-data-msg">
            <i data-lucide="loader" class="animate-spin"></i>
            <p>Performing calculations and tracing complexity. Please wait...</p>
        </div>
    `;
    lucide.createIcons();
    
    try {
        const response = await fetch("/api/multiply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ num1, num2 })
        });
        
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        
        traceData = data;
        
        // Render Metric Cards
        renderMetricCards(data.metrics);
        
        // Update visualizer state
        const nikhilamBtn = document.getElementById("viz-mode-nikhilam");
        if (data.metrics.nikhilam && data.metrics.nikhilam.suitable) {
            nikhilamBtn.removeAttribute("disabled");
        } else {
            nikhilamBtn.setAttribute("disabled", "true");
            if (currentMode === "nikhilam") currentMode = "urdhva";
        }
        
        const ekadhikenaBtn = document.getElementById("viz-mode-ekadhikena");
        if (data.metrics.ekadhikena && data.metrics.ekadhikena.suitable) {
            ekadhikenaBtn.removeAttribute("disabled");
        } else {
            ekadhikenaBtn.setAttribute("disabled", "true");
            if (currentMode === "ekadhikena") currentMode = "urdhva";
        }
        
        const ekanyunenaBtn = document.getElementById("viz-mode-ekanyunena");
        if (data.metrics.ekanyunena && data.metrics.ekanyunena.suitable) {
            ekanyunenaBtn.removeAttribute("disabled");
        } else {
            ekanyunenaBtn.setAttribute("disabled", "true");
            if (currentMode === "ekanyunena") currentMode = "urdhva";
        }

        const kapatasandhiBtn = document.getElementById("viz-mode-kapatasandhi");
        kapatasandhiBtn.removeAttribute("disabled");

        const khandaBtn = document.getElementById("viz-mode-khanda");
        khandaBtn.removeAttribute("disabled");

        const dpBtn = document.getElementById("viz-mode-dp");
        dpBtn.removeAttribute("disabled");

        const fftBtn = document.getElementById("viz-mode-fft");
        fftBtn.removeAttribute("disabled");
        
        // Reset active visualizer buttons
        document.querySelectorAll(".viz-mode-btn").forEach(b => b.classList.remove("active"));
        document.getElementById(`viz-mode-${currentMode}`).classList.add("active");
        
        // Adjust visualizer title
        const titles = {
            urdhva: "Vedic (Swami Bharati Krishna Tirtha Ji): Urdhva Tiryakbhyam Visualizer",
            schoolbook: "Schoolbook Long Multiplication Visualizer",
            nikhilam: "Vedic (Swami Bharati Krishna Tirtha Ji): Nikhilam Method Visualizer",
            ekadhikena: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekadhikena Method Visualizer",
            ekanyunena: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekanyunena Method Visualizer",
            kapatasandhi: "Indian Lattice: Kapatasandhi Visualizer",
            khanda: "Indian Distributive: Khanda Ganita Visualizer",
            dp: "Dynamic Programming: Suffix Tabulation Visualizer",
            fft: "Fast Fourier Transform (Schönhage-Strassen) Visualizer"
        };
        document.getElementById("viz-alg-title").textContent = titles[currentMode];
        
        // Initialize Visualizer Steps
        resetVisualizer();
        
    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="no-data-msg text-error">
                <i data-lucide="alert-triangle"></i>
                <p>Failed to connect to server backend. Verify server status.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

// Render Comparison Dashboard Cards
function renderMetricCards(metrics) {
    const container = document.getElementById("metrics-grid-container");
    container.innerHTML = "";
    
    const cardConfigs = [
        { key: "urdhva", name: "Vedic (Swami Bharati Krishna Tirtha Ji): Urdhva Tiryakbhyam", class: "vedic", desc: "General crosswise multiplication method.", scale: "small" },
        { key: "nikhilam", name: "Vedic (Swami Bharati Krishna Tirtha Ji): Nikhilam", class: "vedic", desc: "Specialized base-deviation shortcut.", scale: "small" },
        { key: "ekadhikena", name: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekadhikena Purvena", class: "vedic", desc: "For prefix-identical pairs with units summing to 10.", scale: "small" },
        { key: "ekanyunena", name: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekanyunena Purvena", class: "vedic", desc: "For pairs where one multiplier consists of all 9s.", scale: "small" },
        { key: "kapatasandhi", name: "Indian Lattice: Kapatasandhi", class: "vedic", desc: "Aryabhata/Sridharacharya lattice grid multiplication.", scale: "large" },
        { key: "khanda_ganita", name: "Indian Distributive: Khanda Ganita", class: "vedic", desc: "Bhaskara II place-value distributive multiplication.", scale: "large" },
        { key: "schoolbook", name: "Modern: Schoolbook Long", class: "school", desc: "Standard row-by-row carry digit accumulation.", scale: "small" },
        { key: "karatsuba", name: "Modern: Karatsuba Algorithm", class: "karatsuba", desc: "Divide & conquer sub-quadratic arithmetic.", scale: "large" },
        { key: "dp", name: "Modern: Dynamic Programming", class: "school", desc: "Bottom-up tabulation with 10x10 digit product cache.", scale: "small" },
        { key: "fft", name: "Modern: FFT Multiplication", class: "karatsuba", desc: "Cooley-Tukey polynomial multiplication.", scale: "large" },
        { key: "builtin", name: "Modern: Python Built-In (*)", class: "builtin", desc: "Highly optimized C-level binary implementation.", scale: "large" }
    ];
    
    // Find average timing and memory among active to calculate baseline fallback
    let totalTime = 0;
    let totalMem = 0;
    let activeCount = 0;
    cardConfigs.forEach(cfg => {
        const met = metrics[cfg.key];
        if (met && met.active) {
            totalTime += met.time_ms;
            totalMem += met.memory_bytes;
            activeCount++;
        }
    });
    
    const avgTime = activeCount > 0 ? totalTime / activeCount : 0;
    const avgMem = activeCount > 0 ? totalMem / activeCount : 0;
    
    const schoolbookMetric = metrics["schoolbook"];
    const hasSchoolbook = schoolbookMetric && schoolbookMetric.active;
    const baselineTime = hasSchoolbook ? schoolbookMetric.time_ms : avgTime;
    const baselineMem = hasSchoolbook ? schoolbookMetric.memory_bytes : avgMem;
    
    // Find min timing among active to calculate speed factor
    let minTime = Infinity;
    cardConfigs.forEach(cfg => {
        const met = metrics[cfg.key];
        if (met && met.active && met.time_ms > 0) {
            if (met.time_ms < minTime) minTime = met.time_ms;
        }
    });
    
    cardConfigs.forEach(cfg => {
        const met = metrics[cfg.key];
        if (!met) return;
        
        const card = document.createElement("div");
        card.className = `glass-card metric-card ${cfg.class}`;
        
        let headerStatus = "";
        let resultHtml = "";
        let statsHtml = "";
        
        if (met.active) {
            headerStatus = `<span class="status-badge success"><i data-lucide="check-circle-2"></i> Correct</span>`;
            
            // Result truncation logic
            const fullResult = met.result;
            const isTruncated = fullResult.length > 60;
            const displayResult = isTruncated ? fullResult.substring(0, 57) : fullResult;
            
            resultHtml = `
                <div class="result-section">
                    <div class="result-header">
                        <span>Output Result:</span>
                        <span>${fullResult.length} digits</span>
                    </div>
                    <div class="result-val ${isTruncated ? 'truncated' : ''}" id="res-val-${cfg.key}">${displayResult}</div>
                    ${isTruncated ? `
                        <div class="result-actions">
                            <button class="btn btn-secondary btn-tiny" onclick="viewFullResult('${cfg.name}', '${fullResult}')">
                                <i data-lucide="maximize-2"></i> View Full
                            </button>
                        </div>
                    ` : ""}
                </div>
            `;
            
            // Format time and memory
            const timeDisplay = met.time_ms < 0.001 ? `${(met.time_ms * 1000).toFixed(3)} &mu;s` : `${met.time_ms.toFixed(4)} ms`;
            const memDisplay = formatBytes(met.memory_bytes);
            
            // Calculate comparison indicators
            let timeArrowHtml = "";
            if (cfg.key === "schoolbook") {
                timeArrowHtml = `<span class="perf-neutral" title="Baseline Reference"><i data-lucide="minus" style="width:12px;height:12px"></i> Base</span>`;
            } else if (met.time_ms < baselineTime) {
                const pct = baselineTime > 0 ? ((baselineTime - met.time_ms) / baselineTime * 100).toFixed(0) : 100;
                timeArrowHtml = `<span class="perf-better" title="Faster than Schoolbook by ${pct}%"><i data-lucide="arrow-down" style="width:12px;height:12px"></i> -${pct}%</span>`;
            } else if (met.time_ms > baselineTime) {
                const pct = baselineTime > 0 ? ((met.time_ms - baselineTime) / baselineTime * 100).toFixed(0) : 0;
                timeArrowHtml = `<span class="perf-worse" title="Slower than Schoolbook by ${pct}%"><i data-lucide="arrow-up" style="width:12px;height:12px"></i> +${pct}%</span>`;
            } else {
                timeArrowHtml = `<span class="perf-neutral" title="Equal to Baseline"><i data-lucide="minus" style="width:12px;height:12px"></i> Equal</span>`;
            }
            
            let memArrowHtml = "";
            if (cfg.key === "schoolbook") {
                memArrowHtml = `<span class="perf-neutral" title="Baseline Reference"><i data-lucide="minus" style="width:12px;height:12px"></i> Base</span>`;
            } else if (met.memory_bytes < baselineMem) {
                const pct = baselineMem > 0 ? ((baselineMem - met.memory_bytes) / baselineMem * 100).toFixed(0) : 0;
                memArrowHtml = `<span class="perf-better" title="Uses ${pct}% less memory than Schoolbook"><i data-lucide="arrow-down" style="width:12px;height:12px"></i> -${pct}%</span>`;
            } else if (met.memory_bytes > baselineMem) {
                const pct = baselineMem > 0 ? ((met.memory_bytes - baselineMem) / baselineMem * 100).toFixed(0) : 0;
                memArrowHtml = `<span class="perf-worse" title="Uses ${pct}% more memory than Schoolbook"><i data-lucide="arrow-up" style="width:12px;height:12px"></i> +${pct}%</span>`;
            } else {
                memArrowHtml = `<span class="perf-neutral" title="Equal to Baseline"><i data-lucide="minus" style="width:12px;height:12px"></i> Equal</span>`;
            }
            
            // Calculate relative speed multiplier
            let speedRatioHtml = "";
            if (minTime !== Infinity && met.time_ms > 0) {
                const ratio = met.time_ms / minTime;
                if (ratio === 1) {
                    speedRatioHtml = `<span class="stat-sub text-success" style="color: var(--vedic-color); font-weight:700">★ Fastest</span>`;
                } else {
                    speedRatioHtml = `<span class="stat-sub text-muted">${ratio.toFixed(1)}x slower</span>`;
                }
            }
            
            // Operation counting display
            let opsDisplayHtml = "";
            if (met.ops) {
                opsDisplayHtml = `
                    <div class="stat-item stat-item-full">
                        <span class="stat-label">Digit-Level Operations Complexity</span>
                        <div class="op-pills">
                            <div class="op-pill" title="Single digit multiplications">Multiplys: ${met.ops.multiplications.toLocaleString()}</div>
                            <div class="op-pill" title="Digit additions and carry additions">Add: ${met.ops.additions.toLocaleString()}</div>
                            <div class="op-pill" title="Memory writes of digits">Writes: ${met.ops.writes.toLocaleString()}</div>
                        </div>
                    </div>
                `;
            }
            
            statsHtml = `
                <div class="stats-list">
                    <div class="stat-item">
                        <span class="stat-label">Execution Time</span>
                        <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap">
                            <span class="stat-val">${timeDisplay}</span>
                            ${timeArrowHtml}
                        </div>
                        ${speedRatioHtml}
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Peak Memory Allocation</span>
                        <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap">
                            <span class="stat-val">${memDisplay}</span>
                            ${memArrowHtml}
                        </div>
                        <span class="stat-sub text-muted">tracemalloc</span>
                    </div>
                    ${opsDisplayHtml}
                </div>
            `;
            
        } else {
            const isSpecializedVedicSkipped = ["nikhilam", "ekadhikena", "ekanyunena"].includes(cfg.key) && !met.suitable;
            const badgeClass = isSpecializedVedicSkipped ? "skipped" : "error";
            const badgeText = isSpecializedVedicSkipped ? "Not Suitable" : "Error";
            const icon = isSpecializedVedicSkipped ? "info" : "alert-circle";
            
            headerStatus = `<span class="status-badge ${badgeClass}"><i data-lucide="${icon}"></i> ${badgeText}</span>`;
            
            resultHtml = `
                <div class="result-section" style="border-color: rgba(239, 68, 68, 0.1); background: rgba(239, 68, 68, 0.02)">
                    <div class="result-header" style="color: var(--text-muted)">Computation Message:</div>
                    <div class="result-val" style="color: var(--text-secondary); font-size: 0.85rem; max-height:none">${met.error || "Execution skipped."}</div>
                </div>
            `;
            
            statsHtml = `
                <div class="stats-list" style="opacity: 0.25">
                    <div class="stat-item">
                        <span class="stat-label">Execution Time</span>
                        <span class="stat-val">-- ms</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Memory Usage</span>
                        <span class="stat-val">-- KB</span>
                    </div>
                </div>
            `;
        }
        
        let scaleBadgeHtml = "";
        if (cfg.scale === "large") {
            scaleBadgeHtml = `<span class="scale-badge scale-large"><i data-lucide="gauge"></i> Best for Scalable Problems</span>`;
        } else {
            scaleBadgeHtml = `<span class="scale-badge scale-small"><i data-lucide="layers"></i> Best for Small Scale</span>`;
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="alg-badge">
                    <i data-lucide="cpu"></i>
                    <span>${cfg.name}</span>
                </div>
                ${headerStatus}
            </div>
            ${scaleBadgeHtml}
            <p class="sidebar-help" style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.8rem">${cfg.desc}</p>
            ${resultHtml}
            ${statsHtml}
        `;
        
        container.appendChild(card);
    });
    
    lucide.createIcons();
}

// View Full Result Modal Logic
function viewFullResult(algName, fullResult) {
    document.getElementById("modal-alg-name").textContent = algName;
    const textarea = document.getElementById("modal-result-textarea");
    textarea.value = fullResult;
    
    const modal = document.getElementById("result-modal");
    modal.classList.add("active");
    
    // Copy handler setup
    const copyBtn = document.getElementById("modal-copy-btn");
    copyBtn.innerHTML = `<i data-lucide="copy"></i> Copy Output`;
    lucide.createIcons();
    
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(fullResult);
        copyBtn.innerHTML = `<i data-lucide="check"></i> Copied!`;
        lucide.createIcons();
        setTimeout(() => {
            copyBtn.innerHTML = `<i data-lucide="copy"></i> Copy Output`;
            lucide.createIcons();
        }, 1500);
    };
}

function closeModal() {
    document.getElementById("result-modal").classList.remove("active");
}

// Step-by-Step Visualizer UI Management
function initVisualizerControls() {
    // Mode switcher buttons
    const modeBtns = document.querySelectorAll(".viz-mode-btn");
    modeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            modeBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const mode = btn.id.replace("viz-mode-", "");
            currentMode = mode;
            
            // Adjust visualizer title
            const titles = {
                urdhva: "Vedic (Swami Bharati Krishna Tirtha Ji): Urdhva Tiryakbhyam Visualizer",
                schoolbook: "Schoolbook Long Multiplication Visualizer",
                nikhilam: "Vedic (Swami Bharati Krishna Tirtha Ji): Nikhilam Method Visualizer",
                ekadhikena: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekadhikena Method Visualizer",
                ekanyunena: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekanyunena Method Visualizer",
                kapatasandhi: "Indian Lattice: Kapatasandhi Visualizer",
                khanda: "Indian Distributive: Khanda Ganita Visualizer",
                dp: "Dynamic Programming: Suffix Tabulation Visualizer",
                fft: "Fast Fourier Transform (Schönhage-Strassen) Visualizer"
            };
            document.getElementById("viz-alg-title").textContent = titles[mode];
            
            resetVisualizer();
        });
    });
    
    // Playback Buttons
    document.getElementById("viz-start-btn").addEventListener("click", () => goStep(0));
    document.getElementById("viz-end-btn").addEventListener("click", () => {
        const maxStep = getStepsCount() - 1;
        goStep(maxStep);
    });
    document.getElementById("viz-prev-btn").addEventListener("click", () => goStep(currentStep - 1));
    document.getElementById("viz-next-btn").addEventListener("click", () => goStep(currentStep + 1));
    
    const playBtn = document.getElementById("viz-play-btn");
    playBtn.addEventListener("click", () => {
        if (isPlaying) {
            pausePlayback();
        } else {
            startPlayback();
        }
    });
}

function startPlayback() {
    isPlaying = true;
    const playBtn = document.getElementById("viz-play-btn");
    playBtn.innerHTML = `<i data-lucide="pause"></i>`;
    lucide.createIcons();
    
    playInterval = setInterval(() => {
        const maxStep = getStepsCount() - 1;
        if (currentStep >= maxStep) {
            pausePlayback();
            goStep(0); // loop back
        } else {
            goStep(currentStep + 1);
        }
    }, playSpeed);
}

function pausePlayback() {
    isPlaying = false;
    const playBtn = document.getElementById("viz-play-btn");
    playBtn.innerHTML = `<i data-lucide="play"></i>`;
    lucide.createIcons();
    
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
}

function getStepsCount() {
    if (!traceData || !traceData.traces) return 0;
    if (currentMode === "urdhva" && traceData.traces.urdhva) return traceData.traces.urdhva.length;
    if (currentMode === "schoolbook" && traceData.traces.schoolbook) {
        const rows = traceData.traces.schoolbook.rows;
        const colSums = traceData.traces.schoolbook.column_sums;
        
        let rowSteps = 0;
        rows.forEach(r => { rowSteps += r.steps.length; });
        
        return rowSteps + colSums.length;
    }
    if (currentMode === "nikhilam" && traceData.traces.nikhilam) return 1; // Nikhilam is 1 step conceptual visualization
    if (currentMode === "ekadhikena" && traceData.traces.ekadhikena) return 1;
    if (currentMode === "ekanyunena" && traceData.traces.ekanyunena) return 1;
    if (currentMode === "kapatasandhi" && traceData.traces.kapatasandhi) return 1;
    if (currentMode === "khanda" && traceData.traces.khanda_ganita) return 1;
    if (currentMode === "dp" && traceData.traces.dp) return 1;
    if (currentMode === "fft" && traceData.traces.fft) return 1;
    return 0;
}

function resetVisualizer() {
    pausePlayback();
    currentStep = 0;
    
    const maxSteps = getStepsCount();
    document.getElementById("total-steps-label").textContent = maxSteps;
    document.getElementById("current-step-label").textContent = maxSteps > 0 ? "1" : "0";
    
    renderStep();
}

function goStep(step) {
    const maxSteps = getStepsCount();
    if (maxSteps === 0) return;
    
    if (step < 0) step = 0;
    if (step >= maxSteps) step = maxSteps - 1;
    
    currentStep = step;
    document.getElementById("current-step-label").textContent = currentStep + 1;
    
    renderStep();
}

// Render the active step on the visualizer canvas
function renderStep() {
    const board = document.getElementById("viz-board");
    const commentary = document.getElementById("viz-commentary-text");
    
    if (!traceData || !traceData.traces) {
        board.innerHTML = `
            <div class="viz-placeholder">
                <i data-lucide="sparkles"></i>
                <p>Run the multiplier on the Configuration panel first.</p>
            </div>
        `;
        commentary.innerHTML = "No simulation active. Start by configuring numbers above.";
        lucide.createIcons();
        return;
    }
    
    if (!traceData.can_visualize) {
        board.innerHTML = `
            <div class="viz-placeholder">
                <i data-lucide="alert-circle" class="text-error" style="color:var(--karatsuba-color)"></i>
                <p>Visualization skipped. The inputs are too large (${num1.length} and ${num2.length} digits). Max visualization size is 12x12 digits to keep layout readable.</p>
            </div>
        `;
        commentary.innerHTML = "Input size exceeds visual bounds.";
        lucide.createIcons();
        return;
    }
    
    if (currentMode === "urdhva") {
        renderUrdhvaStep(board, commentary);
    } else if (currentMode === "schoolbook") {
        renderSchoolbookStep(board, commentary);
    } else if (currentMode === "nikhilam") {
        renderNikhilamStep(board, commentary);
    } else if (currentMode === "ekadhikena") {
        renderEkadhikenaStep(board, commentary);
    } else if (currentMode === "ekanyunena") {
        renderEkanyunenaStep(board, commentary);
    } else if (currentMode === "kapatasandhi") {
        renderKapatasandhiStep(board, commentary);
    } else if (currentMode === "khanda") {
        renderKhandaStep(board, commentary);
    } else if (currentMode === "dp") {
        renderDPStep(board, commentary);
    } else if (currentMode === "fft") {
        renderFFTStep(board, commentary);
    }
    
    lucide.createIcons();
}

// Render Vedic Urdhva step
function renderUrdhvaStep(board, commentary) {
    const trace = traceData.traces.urdhva[currentStep];
    if (!trace) return;
    
    // Draw visual grids for two numbers
    // Pad numbers to same size? Or render as they are aligned to right.
    const digitsA = Array.from(num1);
    const digitsB = Array.from(num2);
    
    // Aligned layout
    let html = `
        <div class="viz-grid">
            <!-- SVG Line Overlays -->
            <svg class="viz-lines-svg" id="viz-lines-svg"></svg>
            
            <!-- Carries row -->
            <div class="viz-carry-row">
    `;
    
    const maxLen = Math.max(digitsA.length, digitsB.length);
    const resultLen = digitsA.length + digitsB.length;
    
    // We render carry digits
    // The trace contains "prev_carry" at step trace.step
    for (let i = 0; i < resultLen; i++) {
        const carryPos = resultLen - 1 - i;
        let carryVal = "";
        
        // Show carry digit above the active step position + 1
        if (trace.step === carryPos - 1) {
            carryVal = trace.next_carry > 0 ? trace.next_carry : "";
        } else if (trace.step === carryPos) {
            carryVal = trace.prev_carry > 0 ? trace.prev_carry : "";
        }
        
        html += `<div class="viz-carry-digit">${carryVal}</div>`;
    }
    
    html += `
            </div>
            
            <!-- Number A row -->
            <div class="digit-row">
    `;
    
    // Digits are placed right-aligned
    for (let i = 0; i < maxLen; i++) {
        const idxFromRight = maxLen - 1 - i;
        const char = idxFromRight < digitsA.length ? digitsA[digitsA.length - 1 - idxFromRight] : "";
        
        // Check highlight
        let highlightClass = "";
        const isHighlight = trace.pairs.some(p => p.idx_a === idxFromRight);
        if (isHighlight) highlightClass = "highlight-a";
        
        html += `<div class="viz-digit ${highlightClass}" id="digit-a-${idxFromRight}">${char || "&nbsp;"}</div>`;
    }
    
    html += `
            </div>
            
            <!-- Number B row -->
            <div class="digit-row">
    `;
    
    for (let i = 0; i < maxLen; i++) {
        const idxFromRight = maxLen - 1 - i;
        const char = idxFromRight < digitsB.length ? digitsB[digitsB.length - 1 - idxFromRight] : "";
        
        // Check highlight
        let highlightClass = "";
        const isHighlight = trace.pairs.some(p => p.idx_b === idxFromRight);
        if (isHighlight) highlightClass = "highlight-b";
        
        html += `<div class="viz-digit ${highlightClass}" id="digit-b-${idxFromRight}">${char || "&nbsp;"}</div>`;
    }
    
    // Answer Row
    html += `
            </div>
            
            <!-- Answer Output row -->
            <div class="viz-accumulator">
                <span class="toolbar-label" style="margin-right:auto">Result:</span>
    `;
    
    // Collect output digits written so far (from right to left)
    const writtenDigits = [];
    for (let stepIdx = 0; stepIdx <= currentStep; stepIdx++) {
        const stepTrace = traceData.traces.urdhva[stepIdx];
        writtenDigits[stepTrace.step] = stepTrace.write_digit;
    }
    
    for (let i = resultLen - 1; i >= 0; i--) {
        const digitVal = writtenDigits[i] !== undefined ? writtenDigits[i] : "";
        const isActive = trace.step === i;
        const borderStyle = isActive ? 'style="border-color: var(--vedic-color); background: rgba(16, 185, 129, 0.15); font-weight:800"' : '';
        
        html += `<div class="viz-ans-digit" ${borderStyle}>${digitVal !== "" ? digitVal : "&nbsp;"}</div>`;
    }
    
    html += `
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    // Draw SVG connections
    setTimeout(() => {
        drawVisualizerLines(trace.pairs);
    }, 50);
    
    // Mathematical Commentary Text
    let commentaryHtml = `<h3>Step ${trace.step + 1}: Crosswise Multiplication</h3>`;
    
    if (trace.pairs.length > 0) {
        commentaryHtml += `<p>Multiply digits in crosswise channels matching index positions summing to <strong>${trace.step}</strong> from the right.</p>`;
        commentaryHtml += `<div style="margin: 0.75rem 0; font-family: var(--font-mono); font-size:1.05rem; display:flex; flex-direction:column; gap:0.25rem">`;
        
        const terms = trace.pairs.map(p => {
            return `(${p.digit_a} &times; ${p.digit_b}) = ${p.product}`;
        });
        
        commentaryHtml += terms.join(" + <br>");
        commentaryHtml += `</div>`;
        commentaryHtml += `<p>Crosswise Products Sum = <span class="step-math-highlight">${trace.step_sum}</span></p>`;
    } else {
        commentaryHtml += `<p>Processing remaining carry digits at position <strong>${trace.step}</strong>.</p>`;
    }
    
    commentaryHtml += `
        <div style="margin-top:0.75rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.5rem">
            <p>Add previous carry (<span style="color:var(--karatsuba-color)">${trace.prev_carry}</span>) to product sum (<span class="step-math-highlight">${trace.step_sum}</span>):</p>
            <p style="font-family:var(--font-mono); font-weight:700; margin: 0.25rem 0; color:var(--text-primary)">
                ${trace.step_sum} + ${trace.prev_carry} = ${trace.total}
            </p>
            <p>Write down digit: <strong>${trace.total} % 10 = <span style="color:var(--vedic-color); font-size:1.1rem">${trace.write_digit}</span></strong></p>
            <p>Carry over next step: <strong>${trace.total} / 10 = <span style="color:var(--karatsuba-color); font-size:1.1rem">${trace.next_carry}</span></strong></p>
        </div>
    `;
    
    commentary.innerHTML = commentaryHtml;
}

// Draw line between A and B digits in SVG overlay
function drawVisualizerLines(pairs) {
    const svg = document.getElementById("viz-lines-svg");
    if (!svg) return;
    
    svg.innerHTML = "";
    const svgRect = svg.getBoundingClientRect();
    
    // Explicitly set SVG attributes to match layout dimensions for reliable coordinate alignment
    svg.setAttribute("width", svgRect.width);
    svg.setAttribute("height", svgRect.height);
    
    pairs.forEach(pair => {
        const elA = document.getElementById(`digit-a-${pair.idx_a}`);
        const elB = document.getElementById(`digit-b-${pair.idx_b}`);
        
        if (elA && elB) {
            const rectA = elA.getBoundingClientRect();
            const rectB = elB.getBoundingClientRect();
            
            // Calc center
            const x1 = (rectA.left + rectA.width / 2) - svgRect.left;
            const y1 = (rectA.top + rectA.height / 2) - svgRect.top;
            const x2 = (rectB.left + rectB.width / 2) - svgRect.left;
            const y2 = (rectB.top + rectB.height / 2) - svgRect.top;
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            line.setAttribute("class", "viz-line");
            
            svg.appendChild(line);
        }
    });
}

// Render Modern Schoolbook step
function renderSchoolbookStep(board, commentary) {
    const school = traceData.traces.schoolbook;
    
    // Flat map steps to determine what we show at currentStep
    // Step 1: Generate row 0, digit 0
    // Step 2: Generate row 0, digit 1
    // ...
    // Step S: Sum column 0
    // Step S+1: Sum column 1
    const flatSteps = [];
    
    school.rows.forEach((row, rowIdx) => {
        row.steps.forEach((step, stepIdx) => {
            flatSteps.push({
                type: "row",
                rowIdx: rowIdx,
                stepIdx: stepIdx,
                details: step,
                rowConfig: row
            });
        });
    });
    
    school.column_sums.forEach((col, colIdx) => {
        flatSteps.push({
            type: "sum",
            colIdx: colIdx,
            details: col
        });
    });
    
    const stepObj = flatSteps[currentStep];
    if (!stepObj) return;
    
    // Draw the grid structure representing schoolbook multiplication
    const lenA = num1.length;
    const lenB = num2.length;
    
    let html = `
        <div class="viz-grid" style="font-size: 1.1rem; line-height: 1.6; gap: 0.5rem">
            <!-- Number A row -->
            <div style="font-family: var(--font-mono); text-align: right; letter-spacing: 0.5em; width: 100%; padding-right: 1.5rem">
                ${num1}
            </div>
            
            <!-- Number B row -->
            <div style="font-family: var(--font-mono); text-align: right; letter-spacing: 0.5em; width: 100%; border-bottom: 2.5px solid var(--border-color); padding-bottom: 0.25rem; padding-right: 1.5rem">
                &times; ${num2}
            </div>
            
            <!-- Intermediate rows -->
            <div style="display: flex; flex-direction: column; width: 100%; text-align: right; font-family: var(--font-mono); letter-spacing: 0.5em; padding-right: 1.5rem">
    `;
    
    // Render the intermediate rows
    school.rows.forEach((row, rIdx) => {
        let textContent = row.row_digits;
        
        // Hide details of row not generated yet
        let isVisible = false;
        let highlightStyle = "";
        
        if (stepObj.type === "row") {
            if (rIdx < stepObj.rowIdx) {
                isVisible = true;
            } else if (rIdx === stepObj.rowIdx) {
                isVisible = true;
                highlightStyle = "color: var(--school-color); font-weight:700;";
                // Only show digits up to current digit step index
                const writtenDigitsCount = stepObj.stepIdx + 1;
                // Pad right offsets
                const padStr = "0".repeat(row.shift);
                
                // Collect digits written so far (from right side, reverse order of steps)
                const stepsWritten = row.steps.slice(0, writtenDigitsCount);
                const digitsVal = stepsWritten.map(s => s.write_digit).reverse().join("");
                
                // If it's the last step and carry exists, we might need to handle
                textContent = digitsVal + padStr;
            }
        } else {
            // we are in the summation phase, all rows visible
            isVisible = true;
        }
        
        // If invisible, display space placeholder
        const valueToShow = isVisible ? textContent : "&nbsp;".repeat(row.row_digits.length);
        html += `<div style="${highlightStyle}">${valueToShow}</div>`;
    });
    
    html += `
            </div>
            
            <!-- Final Output row -->
            <div style="font-family: var(--font-mono); text-align: right; letter-spacing: 0.5em; width: 100%; border-top: 2.5px solid var(--border-color); padding-top: 0.25rem; font-weight: 800; color: var(--school-color); padding-right: 1.5rem">
    `;
    
    // Calculate final answer digit display
    let finalAns = "";
    if (stepObj.type === "sum") {
        const colsSummed = school.column_sums.slice(0, stepObj.colIdx + 1);
        finalAns = colsSummed.map(c => c.write_digit).reverse().join("");
    }
    
    html += `
                ${finalAns || "&nbsp;"}
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    // Render Commentary
    let commentaryHtml = "";
    if (stepObj.type === "row") {
        const details = stepObj.details;
        const rowConf = stepObj.rowConfig;
        
        commentaryHtml = `
            <h3>Step ${currentStep + 1}: Intermediate Row Generation</h3>
            <p>Generating Row ${stepObj.rowIdx + 1} by multiplying digit <strong>${details.digit_b}</strong> (Multiplier at position ${stepObj.rowIdx} from right) by Multiplicand digits.</p>
            
            <div style="margin-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem">
                <p>Multiply: <span class="step-math-highlight">${details.digit_b} &times; ${details.digit_a} = ${details.product}</span></p>
                <p>Add carry from previous digit (<span style="color:var(--karatsuba-color)">${details.carry_in}</span>):</p>
                <p style="font-family:var(--font-mono); font-weight:700; margin: 0.25rem 0">
                    ${details.product} + ${details.carry_in} = ${details.total}
                </p>
                <p>Write digit: <strong>${details.total} % 10 = <span style="color:var(--school-color); font-size:1.1rem">${details.write_digit}</span></strong></p>
                <p>Next Carry: <strong>${details.total} / 10 = <span style="color:var(--karatsuba-color); font-size:1.1rem">${details.carry_out}</span></strong></p>
            </div>
        `;
    } else {
        const details = stepObj.details;
        
        // Col summation step
        commentaryHtml = `
            <h3>Step ${currentStep + 1}: Column-wise Summation</h3>
            <p>Summing up digits in Column index <strong>${stepObj.colIdx}</strong> from the right.</p>
            
            <div style="margin-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem">
                <p>Digits in this column: <strong>[${details.digits.join(", ")}]</strong></p>
                <p>Add column digits + previous carry (<span style="color:var(--karatsuba-color)">${details.prev_carry}</span>):</p>
                <p style="font-family:var(--font-mono); font-weight:700; margin: 0.25rem 0">
                    Sum = ${details.total}
                </p>
                <p>Write answer digit: <strong>${details.total} % 10 = <span style="color:var(--school-color); font-size:1.1rem">${details.write_digit}</span></strong></p>
                <p>Carry to next column: <strong>${details.total} / 10 = <span style="color:var(--karatsuba-color); font-size:1.1rem">${details.next_carry}</span></strong></p>
            </div>
        `;
    }
    
    commentary.innerHTML = commentaryHtml;
}

// Render Vedic Nikhilam step
function renderNikhilamStep(board, commentary) {
    const trace = traceData.traces.nikhilam;
    if (!trace) return;
    
    // Render the algebraic breakdown of Nikhilam shortcut
    let html = `
        <div class="viz-grid" style="font-family: var(--font-sans); padding: 1.5rem; text-align: left; width: 100%; gap: 1rem">
            <div class="glass-card" style="border-color: var(--vedic-color); background: rgba(16, 185, 129, 0.03); width: 100%">
                <h4 style="color: var(--vedic-color); margin-bottom: 0.5rem">Selected Base & Deviations</h4>
                <p style="font-size: 0.95rem">Common Base (Power of 10): <strong>${trace.base}</strong> ($10^{${trace.d}}$)</p>
                <p style="font-size: 0.95rem">Deviation 1 ($D_A$): <strong>${trace.num1} - ${trace.base} = <span style="color: ${trace.deviation1 < 0 ? 'var(--error-color)' : 'var(--success-color)'}">${trace.deviation1}</span></strong></p>
                <p style="font-size: 0.95rem">Deviation 2 ($D_B$): <strong>${trace.num2} - ${trace.base} = <span style="color: ${trace.deviation2 < 0 ? 'var(--error-color)' : 'var(--success-color)'}">${trace.deviation2}</span></strong></p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%">
                <div class="glass-card">
                    <h4 style="color: var(--karatsuba-color); margin-bottom: 0.5rem">Left Hand Side (LHS)</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary)">Crosswise Addition:</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">${trace.num1} + (${trace.deviation2})</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">= ${trace.left_part}</p>
                </div>
                <div class="glass-card">
                    <h4 style="color: var(--builtin-color); margin-bottom: 0.5rem">Right Hand Side (RHS)</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary)">Product of Deviations:</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">(${trace.deviation1}) &times; (${trace.deviation2})</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">= ${trace.right_part}</p>
                </div>
            </div>
            
            <div class="glass-card" style="width: 100%; border-top: 2px solid var(--border-color); text-align: center">
                <span class="stat-label">Combined Result Equation</span>
                <p style="font-family: var(--font-mono); font-size: 1.4rem; font-weight:800; color: var(--vedic-color); margin: 0.5rem 0">
                    LHS &times; Base + RHS
                </p>
                <p style="font-family: var(--font-mono); font-size: 1.2rem; color: var(--text-secondary)">
                    ${trace.left_part} &times; ${trace.base} + (${trace.right_part}) = <strong style="color: var(--text-primary)">${parseInt(trace.left_part) * parseInt(trace.base) + parseInt(trace.right_part)}</strong>
                </p>
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    // Commentary details
    commentary.innerHTML = `
        <h3>Conceptual Breakdown: Nikhilam Navatashcaramam Dashatah</h3>
        <p>This Vedic shortcut simplifies multiplication when inputs are close to bases of $10^N$.</p>
        <p style="margin-top:0.5rem">LHS is computed by adding the deviation of one number to the other number: $A + D_B = B + D_A$.</p>
        <p style="margin-top:0.5rem">RHS is the product of deviations: $D_A \times D_B$. If LHS is shifted and added to RHS, it gives the exact multiplication result, saving massive quadratic cross-digit operations.</p>
    `;
}

// Render Vedic Ekadhikena step
function renderEkadhikenaStep(board, commentary) {
    const trace = traceData.traces.ekadhikena;
    if (!trace) return;
    
    let html = `
        <div class="viz-grid" style="font-family: var(--font-sans); padding: 1.5rem; text-align: left; width: 100%; gap: 1rem">
            <div class="glass-card" style="border-color: var(--vedic-color); background: rgba(16, 185, 129, 0.03); width: 100%">
                <h4 style="color: var(--vedic-color); margin-bottom: 0.5rem">Splitting Prefix & Units digits</h4>
                <p style="font-size: 0.95rem">Multiplicand: <strong>${num1}</strong> &rarr; Prefix: <strong style="color:var(--karatsuba-color)">${trace.prefix}</strong>, Last digit: <strong style="color:var(--builtin-color)">${trace.last1}</strong></p>
                <p style="font-size: 0.95rem">Multiplier: <strong>${num2}</strong> &rarr; Prefix: <strong style="color:var(--karatsuba-color)">${trace.prefix}</strong>, Last digit: <strong style="color:var(--builtin-color)">${trace.last2}</strong></p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%">
                <div class="glass-card">
                    <h4 style="color: var(--karatsuba-color); margin-bottom: 0.5rem">Left Hand Side (LHS)</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary)">Prefix &times; (Prefix + 1):</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">${trace.prefix} &times; (${trace.prefix} + 1)</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">= ${trace.left_part}</p>
                </div>
                <div class="glass-card">
                    <h4 style="color: var(--builtin-color); margin-bottom: 0.5rem">Right Hand Side (RHS)</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary)">Units Product (padded to 2 digits):</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">${trace.last1} &times; ${trace.last2}</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">= ${trace.right_part_str}</p>
                </div>
            </div>
            
            <div class="glass-card" style="width: 100%; border-top: 2px solid var(--border-color); text-align: center">
                <span class="stat-label">Combined Result</span>
                <p style="font-family: var(--font-mono); font-size: 1.4rem; font-weight:800; color: var(--vedic-color); margin: 0.5rem 0">
                    LHS | RHS
                </p>
                <p style="font-family: var(--font-mono); font-size: 1.3rem; color: var(--text-primary)">
                    ${trace.left_part} | ${trace.right_part_str} = <strong>${trace.left_part}${trace.right_part_str}</strong>
                </p>
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    commentary.innerHTML = `
        <h3>Conceptual Breakdown: Ekadhikena Purvena</h3>
        <p>This sutra means <em>"By one more than the previous one"</em>. It is used when the preceding digits of both numbers are identical, and the last digits sum to 10.</p>
        <p style="margin-top:0.5rem"><strong>LHS</strong> is Prefix multiplied by one more than itself: $P \times (P + 1)$.</p>
        <p style="margin-top:0.5rem"><strong>RHS</strong> is the product of the last digits. Combined, the result is directly written side by side, saving any long digit-by-digit crosswise multiplication.</p>
    `;
}

// Render Vedic Ekanyunena step
function renderEkanyunenaStep(board, commentary) {
    const trace = traceData.traces.ekanyunena;
    if (!trace) return;
    
    let html = `
        <div class="viz-grid" style="font-family: var(--font-sans); padding: 1.5rem; text-align: left; width: 100%; gap: 1rem">
            <div class="glass-card" style="border-color: var(--vedic-color); background: rgba(16, 185, 129, 0.03); width: 100%">
                <h4 style="color: var(--vedic-color); margin-bottom: 0.5rem">Identify Multiplicand & Multiplier (all 9s)</h4>
                <p style="font-size: 0.95rem">Multiplicand ($A$): <strong>${trace.a}</strong></p>
                <p style="font-size: 0.95rem">Multiplier (9s): <strong>${trace.n9}</strong> (${trace.len_9} digits)</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%">
                <div class="glass-card">
                    <h4 style="color: var(--karatsuba-color); margin-bottom: 0.5rem">Left Hand Side (LHS)</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary)">$A - 1$:</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">${trace.a} - 1</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">= ${trace.left_part}</p>
                </div>
                <div class="glass-card">
                    <h4 style="color: var(--builtin-color); margin-bottom: 0.5rem">Right Hand Side (RHS)</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary)">$999... - \\text{LHS}$:</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">${trace.n9} - ${trace.left_part}</p>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight:700">= ${trace.right_part}</p>
                </div>
            </div>
            
            <div class="glass-card" style="width: 100%; border-top: 2px solid var(--border-color); text-align: center">
                <span class="stat-label">Combined Result</span>
                <p style="font-family: var(--font-mono); font-size: 1.4rem; font-weight:800; color: var(--vedic-color); margin: 0.5rem 0">
                    LHS &times; $10^{\\text{len}(9s)}$ + RHS
                </p>
                <p style="font-family: var(--font-mono); font-size: 1.3rem; color: var(--text-primary)">
                    ${trace.left_part} &times; $10^{${trace.len_9}}$ + ${trace.right_part} = <strong>${trace.left_part}${String(trace.right_part).padStart(trace.len_9, '0')}</strong>
                </p>
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    commentary.innerHTML = `
        <h3>Conceptual Breakdown: Ekanyunena Purvena</h3>
        <p>This sutra means <em>"By one less than the previous one"</em>. It is used when one of the multipliers is composed entirely of the digit 9 (e.g. 99, 999, 9999).</p>
        <p style="margin-top:0.5rem"><strong>LHS</strong> is simply the multiplicand minus one: $A - 1$.</p>
        <p style="margin-top:0.5rem"><strong>RHS</strong> is computed by subtracting LHS from the 9s multiplier. The combined digits write the product instantly with $O(N)$ operations.</p>
    `;
}

// Render Indian Kapatasandhi step
function renderKapatasandhiStep(board, commentary) {
    const trace = traceData.traces.kapatasandhi;
    if (!trace) return;
    
    const num1 = trace.num1;
    const num2 = trace.num2;
    const grid = trace.grid;
    const lenA = num1.length;
    const lenB = num2.length;
    
    let html = `
        <div style="display: flex; gap: 2rem; width: 100%; align-items: flex-start; justify-content: center; flex-wrap: wrap; color: var(--text-primary);">
            <!-- Left Side: Lattice Grid -->
            <div style="background: rgba(15, 23, 42, 0.4); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); overflow: auto;">
                <table style="border-collapse: collapse; font-family: var(--font-mono); font-size: 1.1rem; text-align: center; margin: auto;">
                    <!-- Top row: num1 digits -->
                    <tr>
                        <td style="width: 40px; height: 40px;"></td>
                        ${Array.from(num1).map(d => `<td style="width: 60px; height: 40px; font-weight: 800; color: var(--vedic-color);">${d}</td>`).join("")}
                        <td style="width: 40px; height: 40px;"></td>
                    </tr>
    `;
    
    for (let j = 0; j < lenB; j++) {
        html += `
            <tr>
                <!-- Left side space -->
                <td style="width: 40px; height: 60px;"></td>
        `;
        
        for (let i = 0; i < lenA; i++) {
            const cell = grid[i][j];
            const tens = cell[0];
            const units = cell[1];
            
            html += `
                <td style="width: 60px; height: 60px; border: 2px solid var(--border-color); position: relative; padding: 0; background: rgba(255,255,255,0.02);">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-top: 1px solid var(--border-color); background: linear-gradient(to bottom left, transparent 49.5%, var(--border-color) 49.5%, var(--border-color) 50.5%, transparent 50.5%); pointer-events: none;"></div>
                    <div style="position: absolute; top: 4px; left: 8px; font-size: 0.9rem; font-weight: 700; color: var(--karatsuba-color);">${tens}</div>
                    <div style="position: absolute; bottom: 4px; right: 8px; font-size: 0.9rem; font-weight: 700; color: var(--builtin-color);">${units}</div>
                </td>
            `;
        }
        
        // Right side: num2 digit
        html += `
            <td style="width: 40px; height: 60px; font-weight: 800; color: var(--school-color);">${num2[j]}</td>
            </tr>
        `;
    }
    
    html += `
                    <tr>
                        <td style="width: 40px; height: 40px;"></td>
                        ${Array.from({ length: lenA }).map((_, i) => `<td style="width: 60px; height: 40px;"></td>`).join("")}
                        <td style="width: 40px; height: 40px;"></td>
                    </tr>
                </table>
            </div>
            
            <!-- Right Side: Diagonals Accumulator Table -->
            <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 1rem;">
                <div class="glass-card" style="padding: 1rem; border-color: var(--vedic-color); background: rgba(255,255,255,0.01);">
                    <h4 style="color: var(--vedic-color); margin-bottom: 0.5rem;"><i data-lucide="info"></i> Kapatasandhi Lattice Diagonals</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                        Diagonals run from top-right to bottom-left. Cells contributing to each diagonal are summed together.
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto; padding-right: 0.5rem;">
    `;
    
    const diagVals = trace.diag_vals;
    const resultDigits = trace.result_digits;
    
    for (let k = 0; k < diagVals.length; k++) {
        const contributions = [];
        for (let i = 0; i < lenA; i++) {
            for (let j = 0; j < lenB; j++) {
                if (i + j === k) {
                    contributions.push(`<span style="color:var(--karatsuba-color)">${grid[i][j][0]}</span> (tens of ${num1[i]}&times;${num2[j]})`);
                }
                if (i + j + 1 === k) {
                    contributions.push(`<span style="color:var(--builtin-color)">${grid[i][j][1]}</span> (units of ${num1[i]}&times;${num2[j]})`);
                }
            }
        }
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                <div>
                    <strong>Diag ${k}:</strong> [${contributions.join(" + ")}]
                </div>
                <div style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); font-size: 1rem;">
                    = ${diagVals[k]}
                </div>
            </div>
        `;
    }
    
    html += `
                    </div>
                </div>
                
                <div class="glass-card" style="padding: 1rem; border-color: var(--school-color); background: rgba(255,255,255,0.01);">
                    <h4 style="color: var(--school-color); margin-bottom: 0.5rem;">Final Diagonal Sums with Carry</h4>
                    <p style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 800; color: var(--vedic-color); text-align: center; margin: 0.5rem 0; letter-spacing: 0.2em;">
                        ${resultDigits.join("")}
                    </p>
                </div>
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    commentary.innerHTML = `
        <h3>Conceptual Breakdown: Kapatasandhi Lattice multiplication</h3>
        <p>This ancient Indian method (described by Aryabhata and Sridharacharya) organizes digit products in a lattice grid. Each cell is divided diagonally into tens (top-left) and units (bottom-right).</p>
        <p style="margin-top:0.5rem"><strong>Diagonal Sums</strong>: Summing along the diagonals (from top-right to bottom-left) naturally aligns place-values (ones, tens, hundreds, etc.).</p>
        <p style="margin-top:0.5rem"><strong>Carries</strong>: Carry propagation is performed from right to left (bottom-right diagonal to top-left diagonal) to produce the final product: <strong>${resultDigits.join("")}</strong>.</p>
    `;
}

// Render Indian Khanda Ganita step
function renderKhandaStep(board, commentary) {
    const trace = traceData.traces.khanda_ganita;
    if (!trace) return;
    
    const num1 = trace.num1;
    const num2 = trace.num2;
    const parts = trace.parts;
    const result = trace.result;
    
    let html = `
        <div style="display: flex; flex-direction: column; gap: 1.5rem; width: 100%; font-family: var(--font-sans); padding: 1rem; color: var(--text-primary);">
            <div class="glass-card" style="border-color: var(--vedic-color); background: rgba(16, 185, 129, 0.03);">
                <h4 style="color: var(--vedic-color); margin-bottom: 0.5rem;">Bhaskara II's Distributive Decomposition</h4>
                <p style="font-size: 0.95rem">
                    Multiplicand ($A$): <strong>${num1}</strong>
                </p>
                <p style="font-size: 0.95rem">
                    Multiplier ($B$): <strong>${num2}</strong> decomposed by digit place-values:
                </p>
                <p style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 700; color: var(--karatsuba-color); margin-top: 0.5rem; text-align: center;">
                    ${num2} = ${parts.map(p => `(${p.digit} &times; ${p.place})`).reverse().join(" + ")}
                </p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; flex-wrap: wrap;">
                <div class="glass-card" style="display: flex; flex-direction: column; gap: 0.75rem; background: rgba(255,255,255,0.01);">
                    <h4 style="color: var(--builtin-color); margin-bottom: 0.5rem;">Decomposed Products</h4>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    `;
    
    parts.forEach((p) => {
        html += `
            <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Digit ${p.digit} at $10^{${Math.round(Math.log10(p.place))}}$ place:</div>
                <div style="font-family: var(--font-mono); font-size: 1rem; font-weight: 700; display: flex; justify-content: space-between;">
                    <span>${num1} &times; ${p.digit} &times; ${p.place}</span>
                    <span style="color: var(--vedic-color);">= ${p.shifted_product}</span>
                </div>
            </div>
        `;
    });
    
    html += `
                    </div>
                </div>
                
                <div class="glass-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.01); border-color: var(--school-color);">
                    <h4 style="align-self: flex-start; color: var(--school-color); margin-bottom: 1rem; width: 100%;">Vertical Summation Stack</h4>
                    
                    <div style="font-family: var(--font-mono); font-size: 1.3rem; line-height: 1.8; text-align: right; letter-spacing: 0.1em; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; width: 80%;">
    `;
    
    const maxLen = String(result).length;
    parts.forEach((p, idx) => {
        const sign = idx === parts.length - 1 ? "+" : "&nbsp;";
        const paddedVal = String(p.shifted_product).padStart(maxLen, " ");
        html += `
            <div style="white-space: pre;">${sign} ${paddedVal}</div>
        `;
    });
    
    html += `
                    </div>
                    <div style="font-family: var(--font-mono); font-size: 1.4rem; font-weight: 800; text-align: right; letter-spacing: 0.1em; color: var(--vedic-color); padding-top: 0.5rem; width: 80%; white-space: pre;">
                        &nbsp; ${result}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    commentary.innerHTML = `
        <h3>Conceptual Breakdown: Khanda Ganita Distributive Method</h3>
        <p>Bhaskara II (1114–1185 CE) in his treatise <em>Lilavati</em> detailed <strong>Khanda Ganita</strong> ("part mathematics"). It is based on the distributive property: $A \times B = A \times (B_1 + B_2 + ...)$.</p>
        <p style="margin-top:0.5rem">In this place-value variation, the multiplier is split digit-by-digit into its powers of 10. The multiplicand is multiplied by each component part, and the results are vertically accumulated.</p>
        <p style="margin-top:0.5rem">This matches modern distributive algebra exactly and forms the foundation of standard modern computer algorithms.</p>
    `;
}

// Render Modern Dynamic Programming step
function renderDPStep(board, commentary) {
    const trace = traceData.traces.dp;
    if (!trace) return;
    
    const num1 = trace.num1;
    const num2 = trace.num2;
    const dpStates = trace.dp_states;
    const result = trace.result;
    
    let html = `
        <div style="display: flex; gap: 2rem; width: 100%; align-items: flex-start; justify-content: center; flex-wrap: wrap; color: var(--text-primary); font-family: var(--font-sans);">
            <!-- Left Side: Bottom-up DP Table -->
            <div style="flex: 1.2; min-width: 300px; display: flex; flex-direction: column; gap: 1rem;">
                <div class="glass-card" style="padding: 1.25rem; border-color: var(--vedic-color); background: rgba(255,255,255,0.01);">
                    <h4 style="color: var(--vedic-color); margin-bottom: 0.5rem;"><i data-lucide="table"></i> Bottom-Up Tabulation State Array</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                        State <code>dp[i]</code> stores the value of <code>num1</code> multiplied by the suffix <code>num2[i:]</code>.
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">
    `;
    
    const lenB = num2.length;
    for (let i = lenB; i >= 0; i--) {
        const isActive = (i === 0);
        const borderStyle = isActive ? 'border-color: var(--vedic-color); background: rgba(16, 185, 129, 0.08); font-weight:700;' : 'border-color: rgba(255,255,255,0.05);';
        
        let subproblemStr = "";
        let equationStr = "";
        if (i === lenB) {
            subproblemStr = `dp[${i}] (base case)`;
            equationStr = `0`;
        } else {
            const d = num2[i];
            const power = lenB - 1 - i;
            subproblemStr = `dp[${i}] (suffix: "${num2.substring(i)}")`;
            equationStr = `(${num1} &times; ${d}) &times; 10<sup>${power}</sup> + dp[${i+1}]`;
        }
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; border-radius: 8px; border: 1px solid; ${borderStyle} font-size: 0.85rem;">
                <div>
                    <strong>${subproblemStr}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem; font-family: var(--font-mono);">${equationStr}</div>
                </div>
                <div style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); font-size: 0.95rem; text-align: right; max-width: 50%; word-break: break-all;">
                    = ${dpStates[i]}
                </div>
            </div>
        `;
    }
    
    html += `
                    </div>
                </div>
                
                <div class="glass-card" style="padding: 1rem; border-color: var(--school-color); background: rgba(255,255,255,0.01); text-align: center;">
                    <h4 style="color: var(--school-color); margin-bottom: 0.25rem;">DP Suffix Product (dp[0])</h4>
                    <p style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 800; color: var(--vedic-color); word-break: break-all;">
                        ${result}
                    </p>
                </div>
            </div>
            
            <!-- Right Side: 10x10 Digit DP Lookup Table Cache -->
            <div style="flex: 0.8; min-width: 280px; display: flex; flex-direction: column; gap: 1rem;">
                <div class="glass-card" style="padding: 1rem; border-color: var(--karatsuba-color); background: rgba(255,255,255,0.01);">
                    <h4 style="color: var(--karatsuba-color); margin-bottom: 0.5rem;"><i data-lucide="zap"></i> Digit Product DP Cache</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                        Precomputed 10&times;10 grid stores digit products to eliminate CPU multiplication calls.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(11, 1fr); gap: 2px; font-family: var(--font-mono); font-size: 0.65rem; text-align: center;">
                        <div style="font-weight: 700; color: var(--text-muted);">&times;</div>
                        ${Array.from({ length: 10 }).map((_, i) => `<div style="font-weight: 700; color: var(--karatsuba-color);">${i}</div>`).join("")}
                        
                        ${Array.from({ length: 10 }).map((_, r) => {
                            let rowHtml = `<div style="font-weight: 700; color: var(--builtin-color);">${r}</div>`;
                            for (let c = 0; c < 10; c++) {
                                rowHtml += `<div style="background: rgba(255,255,255,0.03); border-radius: 2px; padding: 2px 0; color: var(--text-secondary);" title="${r} x ${c} = ${r*c}">${r*c}</div>`;
                            }
                            return rowHtml;
                        }).join("")}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    commentary.innerHTML = `
        <h3>Conceptual Breakdown: Dynamic Programming Suffix Tabulation</h3>
        <p>This algorithm models integer multiplication as a Dynamic Programming problem. Suffix subproblems are solved bottom-up starting from the LSB (Least Significant Byte).</p>
        <p style="margin-top:0.5rem"><strong>DP State Definition</strong>: <code>dp[i]</code> computes the product of <code>num1</code> and the suffix of <code>num2</code> starting at index <code>i</code>.</p>
        <p style="margin-top:0.5rem"><strong>Digit DP Cache</strong>: A pre-calculated 10&times;10 multiplication grid stores digit products. Digit multiplications are looked up in $O(1)$ time, completely avoiding any CPU-level integer multiplications. Large multiplication is therefore decomposed entirely into lookups, shifts, and additions.</p>
    `;
}

// Render Modern FFT step
function renderFFTStep(board, commentary) {
    const trace = traceData.traces.fft;
    if (!trace) return;
    
    const num1 = trace.num1;
    const num2 = trace.num2;
    const fftSize = trace.fft_size;
    const firstFFTSlice = trace.first_fft_slice;
    const result = trace.result;
    
    let html = `
        <div style="display: flex; flex-direction: column; gap: 1.5rem; width: 100%; font-family: var(--font-sans); padding: 1rem; color: var(--text-primary);">
            <div class="glass-card" style="border-color: var(--vedic-color); background: rgba(16, 185, 129, 0.03);">
                <h4 style="color: var(--vedic-color); margin-bottom: 0.5rem;">Fast Fourier Transform (Cooley-Tukey FFT)</h4>
                <p style="font-size: 0.95rem">
                    Digits are treated as coefficients of polynomials $A(x)$ and $B(x)$. FFT computes the polynomial product in $O(N \\log N)$ operations.
                </p>
                <p style="font-size: 0.95rem; margin-top: 0.25rem;">
                    Next power-of-2 FFT Size: <strong style="color:var(--karatsuba-color);">${fftSize}</strong>
                </p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; flex-wrap: wrap;">
                <div class="glass-card" style="display: flex; flex-direction: column; gap: 0.75rem; background: rgba(255,255,255,0.01); border-color: var(--builtin-color);">
                    <h4 style="color: var(--builtin-color); margin-bottom: 0.5rem;">Frequency Transformation (FFT)</h4>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                        Transforming coefficients into complex frequency coefficients. First 4 components of $FFT(A)$:
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; font-family: var(--font-mono); font-size: 0.9rem;">
                        ${firstFFTSlice.map((val, idx) => `
                            <div style="padding: 0.5rem; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
                                <span style="color:var(--text-secondary);">Index ${idx}:</span>
                                <span style="color:var(--builtin-color); font-weight:700;">${val}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
                
                <div class="glass-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.01); border-color: var(--school-color);">
                    <h4 style="align-self: flex-start; color: var(--school-color); margin-bottom: 1rem; width: 100%;">Inverse FFT & Carry Propagation</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-self: flex-start; margin-bottom: 1rem;">
                        Inverse FFT transforms frequency products back to coefficients. Real parts are rounded to integers and carry propagated.
                    </p>
                    
                    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; width: 100%; text-align: center;">
                        <span class="stat-label">Result Product</span>
                        <p style="font-family: var(--font-mono); font-size: 1.35rem; font-weight: 800; color: var(--vedic-color); word-break: break-all; margin-top: 0.5rem;">
                            ${result}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    board.innerHTML = html;
    
    commentary.innerHTML = `
        <h3>Conceptual Breakdown: Cooley-Tukey FFT Multiplication</h3>
        <p>This is the standard modern approach for multiplying extremely large numbers (such as in Schönhage-Strassen). It treats digits as coefficients of polynomials: $A(x) = \\sum a_i x^i$.</p>
        <p style="margin-top:0.5rem"><strong>Cooley-Tukey Radix-2 FFT</strong>: Computes the Discrete Fourier Transform (DFT) by recursively dividing the input signal into even and odd indices in $O(N \\log N)$ complexity.</p>
        <p style="margin-top:0.5rem"><strong>Pointwise Multiplication</strong>: Multiplies frequency coefficients element-wise in $O(N)$ operations: $C(\\omega) = A(\\omega) \\times B(\\omega)$.</p>
        <p style="margin-top:0.5rem"><strong>Inverse FFT & Rounding</strong>: Transforms $C(\\omega)$ back to coefficients, rounds real parts to integers, and carry propagates from right to left to produce the final product: <strong>${result}</strong>.</p>
    `;
}

// Run Scaling Benchmark Suite
async function runBenchmarkSuite() {
    let sizesStr = document.getElementById("bench-sizes-input").value.trim();
    if (!sizesStr) {
        sizesStr = "10, 50, 100, 200, 500, 1000";
    }
    const useNikhilam = document.getElementById("bench-nikhilam-check").checked;
    
    const sizes = sizesStr.split(",").map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x > 0);
    
    if (sizes.length === 0) {
        alert("Please enter a valid list of sizes, separated by commas (e.g. 10, 50, 100).");
        return;
    }
    
    // Set loading
    const runBtn = document.getElementById("run-bench-btn");
    const originalText = runBtn.innerHTML;
    runBtn.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Running Suite...`;
    runBtn.disabled = true;
    lucide.createIcons();
    
    try {
        const response = await fetch("/api/bench", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sizes, use_nikhilam_pairs: useNikhilam })
        });
        
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        
        // Draw Charts
        drawCharts(data);
        
    } catch (e) {
        console.error(e);
        alert("Failed to run scaling benchmark. Make sure backend server is active.");
    } finally {
        runBtn.innerHTML = originalText;
        runBtn.disabled = false;
        lucide.createIcons();
    }
}

// Draw scaling graphs using Chart.js
function drawCharts(records) {
    const labels = records.sizes;
    
    // Destroy existing charts to reload clean configurations
    if (timeChart) timeChart.destroy();
    if (memoryChart) memoryChart.destroy();
    if (opsChart) opsChart.destroy();
    
    const ctxTime = document.getElementById("timeChart").getContext("2d");
    const ctxMemory = document.getElementById("memoryChart").getContext("2d");
    const ctxOps = document.getElementById("opsChart").getContext("2d");
    
    // Common design configurations
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#94a3b8',
                    font: { family: 'Outfit', size: 12, weight: 600 }
                }
            },
            tooltip: {
                backgroundColor: '#0f172a',
                titleFont: { family: 'Outfit', size: 13, weight: 700 },
                bodyFont: { family: 'JetBrains Mono', size: 12 },
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.03)' },
                ticks: { color: '#64748b', font: { family: 'Outfit' } },
                title: { display: true, text: 'Input Digit Size (N)', color: '#94a3b8', font: { family: 'Outfit', weight:600 } }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.03)' },
                ticks: { color: '#64748b', font: { family: 'Outfit' } }
            }
        }
    };

    // 1. Time Chart Gradient & Setup
    const timeDatasets = createDatasets(records, "time");
    timeChart = new Chart(ctxTime, {
        type: 'line',
        data: { labels, datasets: timeDatasets },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: { display: true, text: 'Execution Time (ms)', color: '#94a3b8', font: { family: 'Outfit', weight:600 } }
                }
            }
        }
    });

    // 2. Memory Chart Setup
    const memDatasets = createDatasets(records, "memory");
    memoryChart = new Chart(ctxMemory, {
        type: 'line',
        data: { labels, datasets: memDatasets },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: { display: true, text: 'Peak Memory Allocation (bytes)', color: '#94a3b8', font: { family: 'Outfit', weight:600 } }
                }
            }
        }
    });

    // 3. Ops Complexity Chart Setup
    const opsDatasets = createOpsDatasets(records);
    opsChart = new Chart(ctxOps, {
        type: 'line',
        data: { labels, datasets: opsDatasets },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: { display: true, text: 'Total Digit Operations (Multiplys+Add+Write)', color: '#94a3b8', font: { family: 'Outfit', weight:600 } }
                }
            }
        }
    });
}

function createDatasets(records, metric) {
    const algs = [
        { key: "urdhva", label: "Vedic (Swami Bharati Krishna Tirtha Ji): Urdhva Tiryakbhyam", color: "#10b981" },
        { key: "nikhilam", label: "Vedic (Swami Bharati Krishna Tirtha Ji): Nikhilam", color: "#f43f5e" },
        { key: "ekadhikena", label: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekadhikena", color: "#ec4899" },
        { key: "ekanyunena", label: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekanyunena", color: "#3b82f6" },
        { key: "kapatasandhi", label: "Indian Lattice: Kapatasandhi", color: "#06b6d4" },
        { key: "khanda_ganita", label: "Indian Distributive: Khanda Ganita", color: "#a855f7" },
        { key: "schoolbook", label: "Modern: Schoolbook Long", color: "#8b5cf6" },
        { key: "karatsuba", label: "Modern: Karatsuba", color: "#f59e0b" },
        { key: "dp", label: "Modern: Dynamic Programming", color: "#eab308" },
        { key: "fft", label: "Modern: FFT Multiplication", color: "#14b8a6" },
        { key: "builtin", label: "Modern: Python Built-in", color: "#06b6d4" }
    ];
    
    return algs.map(alg => {
        const rawData = records[alg.key][metric];
        
        return {
            label: alg.label,
            data: rawData,
            borderColor: alg.color,
            backgroundColor: hexToRgba(alg.color, 0.05),
            borderWidth: 2.5,
            pointBackgroundColor: alg.color,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
            spanGaps: true // If some points are null (skipped), draw line through them or break line
        };
    });
}

function createOpsDatasets(records) {
    const algs = [
        { key: "urdhva", label: "Vedic (Swami Bharati Krishna Tirtha Ji): Urdhva Tiryakbhyam", color: "#10b981" },
        { key: "nikhilam", label: "Vedic (Swami Bharati Krishna Tirtha Ji): Nikhilam", color: "#f43f5e" },
        { key: "ekadhikena", label: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekadhikena", color: "#ec4899" },
        { key: "ekanyunena", label: "Vedic (Swami Bharati Krishna Tirtha Ji): Ekanyunena", color: "#3b82f6" },
        { key: "kapatasandhi", label: "Indian Lattice: Kapatasandhi", color: "#06b6d4" },
        { key: "khanda_ganita", label: "Indian Distributive: Khanda Ganita", color: "#a855f7" },
        { key: "schoolbook", label: "Modern: Schoolbook Long", color: "#8b5cf6" },
        { key: "karatsuba", label: "Modern: Karatsuba", color: "#f59e0b" },
        { key: "dp", label: "Modern: Dynamic Programming", color: "#eab308" },
        { key: "fft", label: "Modern: FFT Multiplication", color: "#14b8a6" }
    ];
    
    return algs.map(alg => {
        const rawOps = records[alg.key].ops;
        
        // Sum multiplications + additions + writes to get total operations complexity
        const data = rawOps.map(op => {
            if (!op) return null;
            return op.multiplications + op.additions + op.writes;
        });
        
        return {
            label: alg.label,
            data: data,
            borderColor: alg.color,
            backgroundColor: hexToRgba(alg.color, 0.05),
            borderWidth: 2.5,
            pointBackgroundColor: alg.color,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
            spanGaps: true
        };
    });
}

// Helpers
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (!bytes) return '--';
    
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setLoadingState(loading) {
    // Basic loading cursor
    if (loading) {
        document.body.style.cursor = "wait";
    } else {
        document.body.style.cursor = "default";
    }
}
