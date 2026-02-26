const blank_presentation_template = String.raw`%title: My presentation's title
%subtitle: My presentation's subtitle
%author: Arnaud Lelièvre
        
\section{My blank presentation}
\subsection{my blank presentation with ImGoaTeX}

\begin{frame}{ImGoaTeX is great !}[align=center]<ZoomIn>
    This is a blank presentation.
    \pause
    $\int_{0}^{+\infty} e^{-x^2} dx = \sqrt{\pi}$
    \textbox{Happy coding with ImGoaTeX !}[position=right, rotate=90, fontsize=1.5, border, size=2]
\end{frame}
`


document.addEventListener("DOMContentLoaded", () => {

    const toggleBtn = document.getElementById("toggleButton");
    const rightPane = document.querySelector(".right-pane");
    const leftPane = document.querySelector(".left-pane");
    const dropZone = document.getElementById("dropZone");
    const blankPresentation = document.getElementById("blankPresentation");

    // --------------------
    // Global state
    // --------------------
    let currentFolder = null;
    let currentBasepath = null;
    let currentFilename = null;
    let currentRequiredMedia = [];

    // --------------------
    // Pane toggle
    // --------------------
    toggleBtn.addEventListener("click", () => {
        rightPane.classList.toggle("closed");
        toggleBtn.classList.toggle("closed");
        leftPane.classList.toggle("expanded");
    });

    // --------------------
    // Dropzone visuals
    // --------------------
    dropZone.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    // --------------------
    // Handle .igtex drop
    // --------------------
    dropZone.addEventListener("drop", async (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");

        const file = e.dataTransfer.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (data.error) {
                showPopup(data.error);
                return ;
                /* return alert(data.error); */
            }

            currentFolder = data.folder;
            currentRequiredMedia = data.media.map(m => m[1]);

            setupCompilationUI();

        } catch (err) {
            console.error(err);
            showPopup("Upload failed");
            /* alert("Upload failed"); */
        }
    });

    blankPresentation.addEventListener("click", async () => {
        createBlankPresentation()
    });


    // --------------------
    // Compilation UI
    // --------------------
    function setupCompilationUI() {
        leftPane.innerHTML = "";

        const mediaFiles = new Map();

        if (currentRequiredMedia.length > 0) {
            const mediaDropZone = document.createElement("div");
            mediaDropZone.className = "drop-zone";
            mediaDropZone.innerText = "Drop required media files here";
            leftPane.appendChild(mediaDropZone);

            mediaDropZone.addEventListener("dragover", e => {
                e.preventDefault();
                mediaDropZone.classList.add("dragover");
            });

            mediaDropZone.addEventListener("dragleave", () => {
                mediaDropZone.classList.remove("dragover");
            });

            mediaDropZone.addEventListener("drop", e => {
                e.preventDefault();
                mediaDropZone.classList.remove("dragover");

                for (const file of e.dataTransfer.files) {
                    mediaFiles.set(file.name, file);
                }

                mediaDropZone.innerText =
                    `Files ready: ${[...mediaFiles.keys()].join(", ")}`;
            });
        }

        const compileBtn = document.createElement("button");
        compileBtn.classList.add("compileButton");
        compileBtn.innerText = "Compile";
        leftPane.appendChild(compileBtn);

        compileBtn.addEventListener("click", async () => {
            const missing = currentRequiredMedia.filter(m => !mediaFiles.has(m));
            if (missing.length > 0) {
                showPopup("Missing media files: " + missing.join(", "));
                /* alert("Missing media files: " + missing.join(", ")); */
                return;
            }

            const formData = new FormData();
            mediaFiles.forEach(file => formData.append(file.name, file));

            try {
                const res = await fetch(`/upload_media/${currentFolder}`, {
                    method: "POST",
                    body: formData
                });

                const result = await res.json();
                if (result.error) {
                    showPopup(result.error);
                    return;
                    /* return alert(result.error); */
                }

                displayIframe(result.path);
                spawnButtons(result.path);

            } catch (err) {
                console.error(err);
                showPopup("Compilation failed : " + (err.error || JSON.stringify(err)));
                /* alert("Compilation failed"); */
            }
        });
    }

    async function createBlankPresentation() {
        // 1. Create virtual file
        const blob = new Blob([blank_presentation_template], { type: "text/plain" });
        const file = new File([blob], "main.igtex", { type: "text/plain" });

        const formData = new FormData();
        formData.append("file", file);

        try {
            // 2. Upload
            const uploadRes = await fetch("/upload", {
                method: "POST",
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.error) {
                showPopup(uploadData.error);
                return;
                /* return alert(uploadData.error); */
            }

            currentFolder = uploadData.folder;
            currentRequiredMedia = uploadData.media.map(m => m[1]);

            // 3. Compile immediately (no media needed)
            const compileRes = await fetch(`/upload_media/${currentFolder}`, {
                method: "POST",
                body: new FormData()
            });
            const compileData = await compileRes.json();
            if (compileData.error) {
                showPopup(compileData.error);
                return;
                /* return alert(compileData.error); */
            }

            // 4. Show preview
            displayIframe(compileData.path);

            // 5. Prepare editor state
            currentBasepath = compileData.path.replace("output.html", "");
            currentFilename = "main.igtex";

            // 6. Open editor directly
            openEditor();

        } catch (err) {
            showPopup("Failed to create blank presentation");
            console.error(err);
            /* alert("Failed to create blank presentation"); */
        }
    }



    // --------------------
    // Preview
    // --------------------
    function displayIframe(path) {
        rightPane.innerHTML = "";
        if (rightPane.classList.contains("closed")) {
            toggleBtn.click();
        }
        const iframe = document.createElement("iframe");
        iframe.src = path;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        rightPane.appendChild(iframe);
    }

    // --------------------
    // Download + Edit buttons
    // --------------------
    function spawnButtons(url) {
        currentBasepath = url.replace("output.html", "");
        currentFilename = currentBasepath.slice(16, -18) + ".igtex";

        leftPane.innerHTML = "";

        const downloadBtn = document.createElement("a");
        downloadBtn.href = url;
        downloadBtn.download = "output.html";
        downloadBtn.innerText = "Download output.html";
        downloadBtn.classList.add("download-button");

        const editBtn = document.createElement("button");
        editBtn.innerText = "Edit presentation";
        editBtn.classList.add("edit-button");
        editBtn.addEventListener("click", openEditor);

        leftPane.append(downloadBtn, editBtn);
    }

    // --------------------
    // Editor mode
    // --------------------
    async function openEditor() {
        leftPane.innerHTML = "";

        rightPane.classList.add("closed");
        toggleBtn.classList.add("closed");
        leftPane.classList.add("expanded");

        const textarea = document.createElement("textarea");
        textarea.className = "editor";
        textarea.placeholder = "Loading document…";
        textarea.addEventListener("keydown", (e) => {
            if (e.key == "Tab") {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const spaces = "    "; // 4 spaces
                textarea.value = textarea.value.slice(0, start) + spaces + textarea.value.slice(end);
                textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
                textarea.dispatchEvent(new Event("input"));
                return; // do nothing
            }
        });
        leftPane.appendChild(textarea);

        const actionsPane = document.createElement("div");
        actionsPane.className = "actions-pane";
        leftPane.appendChild(actionsPane);

        try {
            const res = await fetch(currentBasepath + currentFilename);
            textarea.value = await res.text();
        } catch (err) {
            textarea.value = "Failed to load document";
            console.error(err);
        }

        const mediaFiles = new Map();
        spawnEditorMediaZone(mediaFiles, actionsPane);

        const saveBtn = document.createElement("button");
        saveBtn.innerText = "Save [F5]";
        saveBtn.classList.add("saveButton");
        actionsPane.appendChild(saveBtn);

        saveBtn.addEventListener("click", () => {
            compileFromEditor(textarea.value, mediaFiles, true);
        });


        const compileBtn = document.createElement("button");
        compileBtn.innerText = "Compile";
        compileBtn.classList.add("compileButton");
        actionsPane.appendChild(compileBtn);

        compileBtn.addEventListener("click", () => {
            compileFromEditor(textarea.value, mediaFiles);
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "F5") {
                e.preventDefault(); // prevent browser refresh
                compileFromEditor(textarea.value, mediaFiles, true);
            }
        });
    }

    function spawnEditorMediaZone(mediaFiles, actionsPane) {
        const mediaDropZone = document.createElement("div");
        mediaDropZone.className = "drop-zone";
        mediaDropZone.innerText = "Drop required media files here";
        actionsPane.appendChild(mediaDropZone);

        mediaDropZone.addEventListener("dragover", e => {
            e.preventDefault();
            mediaDropZone.classList.add("dragover");
        });

        mediaDropZone.addEventListener("dragleave", () => {
            mediaDropZone.classList.remove("dragover");
        });

        mediaDropZone.addEventListener("drop", e => {
            e.preventDefault();
            mediaDropZone.classList.remove("dragover");

            for (const file of e.dataTransfer.files) {
                mediaFiles.set(file.name, file);
            }

            mediaDropZone.innerText =
                `Files ready: ${[...mediaFiles.keys()].join(", ")}`;
        });
    }

    // --------------------
    // Spawns popup for errors
    // --------------------
    function showPopup(message, duration = 3000) {
        const overlay = document.createElement("div");
        overlay.className = "popup-overlay";

        const box = document.createElement("div");
        box.className = "popup-box";

        // Convert line breaks to <br>
        box.innerHTML = message.replace(/\n/g, "<br>");

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        setTimeout(() => overlay.remove(), duration);

        overlay.addEventListener("click", () => overlay.remove());
    }



    // --------------------
    // Compile edited source
    // --------------------
    async function compileFromEditor(source, mediaFiles, isRefreshOnly = false) {
        const missing = currentRequiredMedia.filter(m => !mediaFiles.has(m));
        if (missing.length > 0) {
            showPopup("Missing media files: " + missing.join(", "));
            return;
        }

        const formData = new FormData();
        formData.append("source", source);
        formData.append("filename", currentFilename);
        formData.append("folder", currentFolder);
        mediaFiles.forEach(file => formData.append(file.name, file));

        try {
            const res = await fetch("/compile_edit", {
                method: "POST",
                body: formData
            });

            const result = await res.json();
            if (result.error) {
                showPopup(result.error);
                return;
            }

            // 1. Always update the iframe
            displayIframe(result.path);

            // 2. Conditional UI Transition
            if (isRefreshOnly) {
                // Ensure the right pane is visible for the refresh
                if (rightPane.classList.contains("closed")) {
                    rightPane.classList.remove("closed");
                    toggleBtn.classList.remove("closed");
                    leftPane.classList.remove("expanded");
                }
                // Logic: Stay in editor. We don't call spawnButtons() here.
                console.log("Quick refresh complete.");
            } else {
                // Normal "Compile" button behavior: Switch to Download/Edit view
                spawnButtons(result.path);
            }

        } catch (err) {
            console.error(err);
            showPopup("Compilation failed : " + (err.error || JSON.stringify(err)));
        }
    }

});

