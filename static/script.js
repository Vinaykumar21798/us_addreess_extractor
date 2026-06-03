document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const uploadForm = document.getElementById("uploadForm");
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");
    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");
    const btnRemoveFile = document.getElementById("btnRemoveFile");
    const btnSubmit = document.getElementById("btnSubmit");
    const progressWrapper = document.getElementById("progressWrapper");
    const progressBar = document.getElementById("progressBar");
    const progressLabel = document.getElementById("progressLabel");
    const progressPercent = document.getElementById("progressPercent");
    const loading = document.getElementById("loading");
    
    // Processing stats elements
    const procPages = document.getElementById("procPages");
    const procChunks = document.getElementById("procChunks");
    const procChunksSent = document.getElementById("procChunksSent");
    const processingStatus = document.getElementById("processingStatus");

    // KPI Elements
    const geoAnalyticsCard = document.getElementById("geoAnalyticsCard");
    const emptyState = document.getElementById("emptyState");
    const statDocs = document.getElementById("statDocs");
    const statTotal = document.getElementById("statTotal");
    const statVerified = document.getElementById("statVerified");
    const statAccuracy = document.getElementById("statAccuracy");
    const statPages = document.getElementById("statPages");
    const statChunks = document.getElementById("statChunks");
    const statChunksSent = document.getElementById("statChunksSent");
    const statTime = document.getElementById("statTime");
    const geoAnalyticsList = document.getElementById("geoAnalyticsList");

    // Skeleton loader element
    const skeletonLoader = document.getElementById("skeletonLoader");

    // Table Elements
    const resultSection = document.getElementById("resultSection");
    const tableBody = document.getElementById("resultTableBody");
    const searchBar = document.getElementById("searchBar");
    const filterState = document.getElementById("filterState");
    const filterVerified = document.getElementById("filterVerified");
    const checkAllRows = document.getElementById("checkAllRows");
    const selectedCounter = document.getElementById("selectedCounter");
    const pageSizeSelect = document.getElementById("pageSizeSelect");
    const tablePaginationInfo = document.getElementById("tablePaginationInfo");
    const paginationNav = document.getElementById("paginationNav");

    // Exporters
    const btnCopyJSON = document.getElementById("btnCopyJSON");
    const btnExportExcel = document.getElementById("btnExportExcel");
    const btnExportCSV = document.getElementById("btnExportCSV");
    const toastContainer = document.getElementById("toastContainer");
    const themeToggleBtn = document.getElementById("themeToggleBtn");

    // --- State Variables ---
    let addresses = [];
    let filteredAddresses = [];
    let currentPage = 1;
    let pageSize = 10;
    let sortColumn = "page_number";
    let sortDirection = "asc";
    let selectedRows = new Set(); // Stores the indices of selected rows

    // --- Theme System ---
    function initTheme() {
        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-bs-theme", savedTheme);
        updateThemeToggleIcon(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("data-bs-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-bs-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        updateThemeToggleIcon(newTheme);
        showToast(`Theme switched to ${newTheme} mode.`, "info");
    }

    function updateThemeToggleIcon(theme) {
        if (theme === "dark") {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun text-warning"></i>';
        } else {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    themeToggleBtn.addEventListener("click", toggleTheme);
    initTheme();

    // --- Toast System ---
    function showToast(message, type = "info") {
        const toastId = `toast-${Date.now()}`;
        const iconMap = {
            success: "fa-circle-check text-success",
            danger: "fa-triangle-exclamation text-danger",
            warning: "fa-exclamation text-warning",
            info: "fa-circle-info text-info"
        };
        const iconClass = iconMap[type] || iconMap.info;
        
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="4000">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center gap-2">
                        <i class="fa-solid ${iconClass} fs-5"></i>
                        <span>${escapeHtml(message)}</span>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML("beforeend", toastHTML);
        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement);
        bsToast.show();
        
        toastElement.addEventListener("hidden.bs.toast", () => {
            toastElement.remove();
        });
    }

    // --- Increment Documents Count Tracker ---
    function getDocsScannedCount() {
        return parseInt(localStorage.getItem("docsScannedCount") || "0");
    }

    function incrementDocsScannedCount() {
        const current = getDocsScannedCount();
        localStorage.setItem("docsScannedCount", current + 1);
        statDocs.textContent = current + 1;
    }

    // Display initial docs count
    statDocs.textContent = getDocsScannedCount();

    // --- File Drag & Drop Handlers ---
    dropzone.addEventListener("click", () => fileInput.click());

    ["dragenter", "dragover"].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add("dragover");
        }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("dragover");
        }, false);
    });

    dropzone.addEventListener("drop", (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    function handleFileSelect(file) {
        // Validation Checks
        const allowedExtensions = [".pdf", ".txt", ".docx"];
        const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        
        if (!allowedExtensions.includes(ext)) {
            showToast("Invalid file type. Please upload PDF, TXT, or DOCX files.", "danger");
            clearFileSelection();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast("File too large. Maximum size allowed is 5MB.", "danger");
            clearFileSelection();
            return;
        }

        if (file.size === 0) {
            showToast("Empty file detected. Please upload a valid document.", "danger");
            clearFileSelection();
            return;
        }

        fileName.textContent = file.name;
        fileSize.textContent = formatBytes(file.size);
        filePreview.style.display = "flex";
        btnSubmit.disabled = false;
        showToast(`Selected file: ${file.name}`, "info");
    }

    btnRemoveFile.addEventListener("click", (e) => {
        e.stopPropagation();
        clearFileSelection();
    });

    function clearFileSelection() {
        fileInput.value = "";
        filePreview.style.display = "none";
        btnSubmit.disabled = true;
        progressWrapper.style.display = "none";
        loading.style.display = "none";
        
        // Reset Progress bar
        progressBar.style.width = "0%";
        progressPercent.textContent = "0%";
        
        // Reset states
        selectedRows.clear();
        checkAllRows.checked = false;
        updateSelectedCounter();
    }

    function formatBytes(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    // --- Submit Form (Extraction Process) ---
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!fileInput.files.length) {
            showToast("Please upload a file first.", "warning");
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append("file", file);

        // UI Transition to Loading
        emptyState.style.display = "none";
        geoAnalyticsCard.style.display = "none";
        resultSection.style.display = "none";
        skeletonLoader.style.display = "none";
        
        progressWrapper.style.display = "block";
        loading.style.display = "block";
        btnSubmit.disabled = true;
        btnRemoveFile.disabled = true;

        // Reset incremental processing details
        procPages.textContent = "0";
        procChunks.textContent = "0";
        procChunksSent.textContent = "0";

        // Progress simulator
        let progressVal = 0;
        const interval = setInterval(() => {
            if (progressVal < 90) {
                progressVal += Math.floor(Math.random() * 15) + 5;
                if (progressVal > 90) progressVal = 90;
                updateProgressBar(progressVal);
            }
        }, 350);

        try {
            const response = await fetch("/extract", {
                method: "POST",
                body: formData
            });

            clearInterval(interval);
            
            // Fast-forward simulator to 100%
            updateProgressBar(100);
            
            const data = await response.json();
            
            // Hide loaders
            loading.style.display = "none";
            progressWrapper.style.display = "none";
            btnSubmit.disabled = false;
            btnRemoveFile.disabled = false;

            if (response.status === 401) {
                showToast("Authentication Error: Invalid API key.", "danger");
                emptyState.style.display = "block";
                return;
            }
            if (response.status === 402) {
                showToast("Quota Exceeded: API quota limit reached.", "danger");
                emptyState.style.display = "block";
                return;
            }
            if (response.status === 413) {
                showToast("File Too Large: Text exceeds extraction limits.", "danger");
                emptyState.style.display = "block";
                return;
            }
            if (response.status === 503) {
                showToast("Network Error: Failed to connect to verification server.", "danger");
                emptyState.style.display = "block";
                return;
            }

            if (!data.success) {
                const errMsg = data.message || "Unexpected Server Error occurred.";
                showToast(errMsg, "danger");
                emptyState.style.display = "block";
                return;
            }

            if (!data.addresses || data.addresses.length === 0) {
                showToast("No Addresses Found: No valid US addresses detected in document.", "warning");
                emptyState.style.display = "block";
                return;
            }

            // Save state data
            addresses = data.addresses;
            selectedRows.clear();
            checkAllRows.checked = false;
            
            // Populate states filters
            populateStatesFilter();

            // Increment Scanned Docs Count
            incrementDocsScannedCount();

            // Show skeleton loader briefly for a premium design feel
            skeletonLoader.style.display = "block";
            await delay(700);
            skeletonLoader.style.display = "none";

            // Bind dashboard counter stats
            bindDashboardStats(data.stats || {});
            
            // Render results
            applyFilters();

            // Display UI Panels
            geoAnalyticsCard.style.display = "block";
            resultSection.style.display = "block";
            if (data.message && data.message.includes("simulation mode")) {
                showToast("Smarty API Quota Exhausted. Running in local simulation mode.", "warning");
            } else {
                showToast(`${addresses.length} addresses successfully extracted and verified.`, "success");
            }

        } catch (err) {
            clearInterval(interval);
            loading.style.display = "none";
            progressWrapper.style.display = "none";
            btnSubmit.disabled = false;
            btnRemoveFile.disabled = false;
            emptyState.style.display = "block";
            
            showToast("Unexpected Server Error: Connection lost or failed to parse response.", "danger");
            console.error(err);
        }
    });

    function updateProgressBar(value) {
        progressBar.style.width = `${value}%`;
        progressPercent.textContent = `${value}%`;
        
        if (value < 25) {
            progressLabel.textContent = "Analyzing document layout...";
            processingStatus.textContent = "Analyzing Document Structure...";
        } else if (value < 50) {
            progressLabel.textContent = "Pre-filtering potential US addresses...";
            processingStatus.textContent = "Detecting Address Blocks...";
        } else if (value < 75) {
            progressLabel.textContent = "Assembling data chunks...";
            processingStatus.textContent = "Segmenting Chunks...";
        } else if (value < 95) {
            progressLabel.textContent = "Querying Smarty US Extract API...";
            processingStatus.textContent = "Validating with Smarty Engine...";
        } else {
            progressLabel.textContent = "Finalizing and deduplicating matches...";
            processingStatus.textContent = "Merging Duplicate Sources...";
        }
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Bind Statistics Dashboard ---
    function bindDashboardStats(stats) {
        const totalCount = addresses.length;
        const verifiedCount = addresses.filter(a => a.verified).length;
        const accuracy = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;
        
        statTotal.textContent = totalCount;
        statVerified.textContent = verifiedCount;
        statAccuracy.textContent = `${accuracy}%`;
        statPages.textContent = stats.total_pages || 1;
        statChunks.textContent = stats.total_chunks || 1;
        statChunksSent.textContent = stats.chunks_sent || 1;
        statTime.textContent = `${stats.processing_time || 0.00}s`;

        // Update processing card summary stats
        procPages.textContent = stats.total_pages || 1;
        procChunks.textContent = stats.total_chunks || 1;
        procChunksSent.textContent = stats.chunks_sent || 1;

        // Render States Geo breakdown list
        renderGeographicDistribution();
    }

    function renderGeographicDistribution() {
        const stateCounts = {};
        let totalWithState = 0;
        
        addresses.forEach(addr => {
            const state = addr.components?.state_abbreviation;
            if (state) {
                stateCounts[state] = (stateCounts[state] || 0) + 1;
                totalWithState++;
            }
        });

        geoAnalyticsList.innerHTML = "";
        
        if (totalWithState === 0) {
            geoAnalyticsList.innerHTML = `<div class="text-muted small py-2">No location analytics available for these addresses.</div>`;
            return;
        }

        const sortedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
        
        // Show top 5 states
        sortedStates.slice(0, 5).forEach(([state, count]) => {
            const pct = Math.round((count / totalWithState) * 100);
            const itemHTML = `
                <div class="geo-item">
                    <div class="geo-bar-label">
                        <span class="geo-bar-state text-primary">${state}</span>
                        <span class="text-muted">${count} addresses (${pct}%)</span>
                    </div>
                    <div class="geo-bar-track">
                        <div class="geo-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
            geoAnalyticsList.insertAdjacentHTML("beforeend", itemHTML);
        });
    }

    // --- Dynamic Filters Population ---
    function populateStatesFilter() {
        const statesSet = new Set();
        addresses.forEach(a => {
            if (a.components?.state_abbreviation) {
                statesSet.add(a.components.state_abbreviation.toUpperCase());
            }
        });

        // Clear existing, keep "All States"
        filterState.innerHTML = '<option value="">All States</option>';
        
        const sortedStates = Array.from(statesSet).sort();
        sortedStates.forEach(state => {
            const option = document.createElement("option");
            option.value = state.toLowerCase();
            option.textContent = state;
            filterState.appendChild(option);
        });
    }

    // --- Filter, Sort, Search & Paginate addresses list ---
    function applyFilters() {
        const query = searchBar.value.toLowerCase().trim();
        const stateVal = filterState.value;
        const verifiedVal = filterVerified.value;

        filteredAddresses = addresses.filter(addr => {
            // Search filter
            const matchSearch = !query || 
                (addr.input_text || "").toLowerCase().includes(query) ||
                (addr.components?.city_name || "").toLowerCase().includes(query) ||
                (addr.components?.state_abbreviation || "").toLowerCase().includes(query) ||
                (addr.components?.zipcode || "").toLowerCase().includes(query) ||
                (addr.source || "").toLowerCase().includes(query);

            // State filter
            const matchState = !stateVal || 
                (addr.components?.state_abbreviation || "").toLowerCase() === stateVal;

            // Verified filter
            const matchVerified = !verifiedVal ||
                (verifiedVal === "verified" && addr.verified) ||
                (verifiedVal === "unverified" && !addr.verified);

            return matchSearch && matchState && matchVerified;
        });

        // Apply Sorting
        sortData();

        currentPage = 1;
        renderTable();
    }

    function sortData() {
        if (!sortColumn) return;

        filteredAddresses.sort((a, b) => {
            let valA, valB;

            if (sortColumn === "page_number") {
                valA = a.page_number || 1;
                valB = b.page_number || 1;
            } else if (sortColumn === "verified") {
                valA = a.verified ? 1 : 0;
                valB = b.verified ? 1 : 0;
            } else if (sortColumn === "input_text") {
                valA = (a.input_text || "").toLowerCase();
                valB = (b.input_text || "").toLowerCase();
            } else {
                valA = (a.components?.[sortColumn] || "").toLowerCase();
                valB = (b.components?.[sortColumn] || "").toLowerCase();
            }

            if (valA < valB) return sortDirection === "asc" ? -1 : 1;
            if (valA > valB) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }

    function renderTable() {
        tableBody.innerHTML = "";

        if (filteredAddresses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center py-4 text-muted">
                        <i class="fa-solid fa-ban fs-4 mb-2 d-block"></i>
                        No matching addresses found.
                    </td>
                </tr>
            `;
            tablePaginationInfo.textContent = "Showing 0-0 of 0 addresses";
            paginationNav.innerHTML = "";
            return;
        }

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredAddresses.length);
        const pageItems = filteredAddresses.slice(startIndex, endIndex);

        pageItems.forEach((addr, sliceIdx) => {
            const globalIdx = startIndex + sliceIdx;
            const isChecked = selectedRows.has(globalIdx);
            const rowClass = isChecked ? "selected-row" : "";
            
            const tr = document.createElement("tr");
            tr.className = rowClass;
            tr.dataset.idx = globalIdx;

            const badgeClass = addr.verified ? "badge-status-verified" : "badge-status-unverified";
            const badgeIcon = addr.verified ? "fa-solid fa-check" : "fa-solid fa-xmark";
            const badgeText = addr.verified ? "Verified" : "Unverified";

            tr.innerHTML = `
                <td>
                    <div class="form-check">
                        <input class="form-check-input row-checkbox" type="checkbox" ${isChecked ? "checked" : ""}>
                    </div>
                </td>
                <td class="text-muted fw-semibold">${globalIdx + 1}</td>
                <td>
                    <span class="badge bg-secondary-subtle text-secondary-emphasis" title="${escapeHtml(addr.source)}">
                        Page ${addr.page_number}
                    </span>
                </td>
                <td class="fw-medium text-main text-wrap" style="max-width: 250px;">${escapeHtml(addr.input_text)}</td>
                <td>${escapeHtml(addr.components?.primary_number || "")}</td>
                <td>${escapeHtml(addr.components?.street_name || "")}</td>
                <td>${escapeHtml(addr.components?.street_suffix || "")}</td>
                <td>${escapeHtml(addr.components?.city_name || "")}</td>
                <td><span class="badge-state-abbr">${escapeHtml(addr.components?.state_abbreviation || "")}</span></td>
                <td>${escapeHtml(addr.components?.zipcode || "")}</td>
                <td class="text-center">
                    <span class="badge-status ${badgeClass}">
                        <i class="${badgeIcon}"></i>${badgeText}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-outline-primary btn-row-action btn-copy-row" title="Copy Address string">
                        <i class="fa-solid fa-copy"></i> Copy
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });

        // Update selected rows highlighting & listeners
        bindRowCheckboxListeners();
        updateSelectedCounter();

        // Update stats
        tablePaginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredAddresses.length} addresses`;
        renderPaginationNav();
    }

    function renderPaginationNav() {
        paginationNav.innerHTML = "";
        const totalPages = Math.ceil(filteredAddresses.length / pageSize);
        if (totalPages <= 1) return;

        // Previous Link
        const prevLi = document.createElement("li");
        prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>`;
        paginationNav.appendChild(prevLi);

        // Pages numbers links
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let p = startPage; p <= endPage; p++) {
            const li = document.createElement("li");
            li.className = `page-item ${currentPage === p ? "active" : ""}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${p}">${p}</a>`;
            paginationNav.appendChild(li);
        }

        // Next Link
        const nextLi = document.createElement("li");
        nextLi.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>`;
        paginationNav.appendChild(nextLi);

        // Add Listeners
        paginationNav.querySelectorAll(".page-link").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const targetPage = parseInt(link.dataset.page);
                if (targetPage >= 1 && targetPage <= totalPages) {
                    currentPage = targetPage;
                    renderTable();
                }
            });
        });
    }

    // --- Row checkbox and Select All actions ---
    function bindRowCheckboxListeners() {
        const rowCheckboxes = tableBody.querySelectorAll(".row-checkbox");
        rowCheckboxes.forEach(chk => {
            chk.addEventListener("change", (e) => {
                const tr = chk.closest("tr");
                const globalIdx = parseInt(tr.dataset.idx);
                
                if (chk.checked) {
                    selectedRows.add(globalIdx);
                    tr.classList.add("selected-row");
                } else {
                    selectedRows.delete(globalIdx);
                    tr.classList.remove("selected-row");
                }

                // Check/Uncheck the top selector based on if all rows on screen are checked
                updateSelectAllState();
                updateSelectedCounter();
            });
        });

        // Copy individual row listener
        tableBody.querySelectorAll(".btn-copy-row").forEach(btn => {
            btn.addEventListener("click", () => {
                const tr = btn.closest("tr");
                const globalIdx = parseInt(tr.dataset.idx);
                const addr = filteredAddresses[globalIdx];
                if (addr) {
                    copyToClipboard(addr.input_text);
                }
            });
        });
    }

    checkAllRows.addEventListener("change", (e) => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredAddresses.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const checkbox = tableBody.querySelector(`tr[data-idx="${i}"] .row-checkbox`);
            if (checkbox) {
                checkbox.checked = checkAllRows.checked;
                const tr = checkbox.closest("tr");
                
                if (checkAllRows.checked) {
                    selectedRows.add(i);
                    tr.classList.add("selected-row");
                } else {
                    selectedRows.delete(i);
                    tr.classList.remove("selected-row");
                }
            }
        }
        updateSelectedCounter();
    });

    function updateSelectAllState() {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredAddresses.length);
        
        let allChecked = true;
        for (let i = startIndex; i < endIndex; i++) {
            if (!selectedRows.has(i)) {
                allChecked = false;
                break;
            }
        }
        checkAllRows.checked = allChecked && filteredAddresses.length > 0;
    }

    function updateSelectedCounter() {
        selectedCounter.textContent = `${selectedRows.size} rows selected`;
    }

    // --- Search, Filters & Sorting Listeners ---
    searchBar.addEventListener("input", applyFilters);
    filterState.addEventListener("change", applyFilters);
    filterVerified.addEventListener("change", applyFilters);
    
    pageSizeSelect.addEventListener("change", () => {
        pageSize = parseInt(pageSizeSelect.value);
        currentPage = 1;
        renderTable();
    });

    // Column sorting headers listener
    document.querySelectorAll("#resultsTable th.sortable").forEach(header => {
        header.addEventListener("click", () => {
            const column = header.dataset.sort;
            
            // Remove sort classes from all headers
            document.querySelectorAll("#resultsTable th.sortable i").forEach(icon => {
                icon.className = "fa-solid fa-sort sort-indicator text-muted ms-1";
            });

            if (sortColumn === column) {
                sortDirection = sortDirection === "asc" ? "desc" : "asc";
            } else {
                sortColumn = column;
                sortDirection = "asc";
            }

            const icon = header.querySelector("i");
            if (sortDirection === "asc") {
                icon.className = "fa-solid fa-sort-up sort-indicator text-primary ms-1";
            } else {
                icon.className = "fa-solid fa-sort-down sort-indicator text-primary ms-1";
            }

            applyFilters();
        });
    });

    // --- Export Systems ---
    function getSelectedOrAll() {
        if (selectedRows.size > 0) {
            // Return only selected
            return Array.from(selectedRows).map(idx => filteredAddresses[idx]).filter(Boolean);
        }
        // If nothing is selected, return all filtered rows
        return filteredAddresses;
    }

    // Copy selected/all to Clipboard as JSON
    btnCopyJSON.addEventListener("click", () => {
        const targetList = getSelectedOrAll();
        if (targetList.length === 0) {
            showToast("No data available to export.", "warning");
            return;
        }

        const jsonStr = JSON.stringify(targetList, null, 2);
        copyToClipboard(jsonStr, "JSON data copied to clipboard.");
    });

    // Download CSV
    btnExportCSV.addEventListener("click", () => {
        const targetList = getSelectedOrAll();
        if (targetList.length === 0) {
            showToast("No data available to export.", "warning");
            return;
        }

        const headers = ["Index", "Page Source", "Input Address", "Primary Number", "Street", "Suffix", "City", "State", "ZIP Code", "Verified"];
        const rows = targetList.map((addr, idx) => {
            const c = addr.components || {};
            return [
                idx + 1,
                `Page ${addr.page_number}`,
                addr.input_text || "",
                c.primary_number || "",
                c.street_name || "",
                c.street_suffix || "",
                c.city_name || "",
                c.state_abbreviation || "",
                c.zipcode || "",
                addr.verified ? "VERIFIED" : "UNVERIFIED"
            ];
        });

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.map(h => `"${h}"`).join(",") + "\n";
        rows.forEach(r => {
            csvContent += r.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `extracted_addresses_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`CSV file for ${targetList.length} addresses downloaded.`, "success");
    });

    // Download Excel (.xlsx) using SheetJS
    btnExportExcel.addEventListener("click", () => {
        const targetList = getSelectedOrAll();
        if (targetList.length === 0) {
            showToast("No data available to export.", "warning");
            return;
        }

        const headers = ["Index", "Page Source", "Input Address", "Primary Number", "Street", "Suffix", "City", "State", "ZIP Code", "Verified"];
        const rows = targetList.map((addr, idx) => {
            const c = addr.components || {};
            return [
                idx + 1,
                `Page ${addr.page_number}`,
                addr.input_text || "",
                c.primary_number || "",
                c.street_name || "",
                c.street_suffix || "",
                c.city_name || "",
                c.state_abbreviation || "",
                c.zipcode || "",
                addr.verified ? "VERIFIED" : "UNVERIFIED"
            ];
        });

        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Addresses");

        XLSX.writeFile(wb, `extracted_addresses_${Date.now()}.xlsx`);
        showToast(`Excel file for ${targetList.length} addresses downloaded.`, "success");
    });

    // Helpers
    function copyToClipboard(text, successMsg = "Address copied to clipboard.") {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMsg, "success");
        }).catch(err => {
            showToast("Failed to copy data.", "danger");
            console.error("Clipboard error: ", err);
        });
    }

    function escapeHtml(str) {
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});