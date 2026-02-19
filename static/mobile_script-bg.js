(() => {
    const canvas = document.getElementById("bg");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    let w, h;
    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    const mouse = { x: w / 2, y: h / 2 };
    const smoothed = { x: w/2, y: h/2 };
    const smoothing = 0.0001; // 0 < smoothing < 1

    window.addEventListener("mousemove", e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // Fewer lines
    const hLineCount = window.innerWidth < 768 ? 6 : 6;
    const vLineCount = window.innerWidth < 768 ? 10 : 12;
    const pointsPerLine = 100;
    const strength = 2;
    const sigma = Math.exp(18);
    const timeSpeed = 0.001;

    // Precompute horizontal lines
    const hLines = [];
    for (let i = 0; i < hLineCount; i++) {
        const y = (i / (hLineCount - 1)) * h;
        const points = [];
        for (let j = 0; j < pointsPerLine; j++) points.push(j / (pointsPerLine - 1));
        hLines.push({ y, points });
    }

    // Precompute vertical lines
    const vLines = [];
    for (let i = 0; i < vLineCount; i++) {
        const x = (i / (vLineCount - 1)) * w;
        const points = [];
        for (let j = 0; j < pointsPerLine; j++) points.push(j / (pointsPerLine - 1));
        vLines.push({ x, points });
    }

    let lastTime = 0;

    function draw(t) {
        if (t - lastTime < 33) { // ~30 FPS
            requestAnimationFrame(draw);
            return;
        }
        lastTime = t;

        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;

        // --- Horizontal lines ---
        for (let i = 0; i < hLineCount; i++) {
            const yBase = hLines[i].y;

            ctx.beginPath();
            for (let j = 0; j < pointsPerLine; j++) {
                const xBase = hLines[i].points[j] * w;

                smoothed.x += (mouse.x - smoothed.x) * smoothing;
                smoothed.y += (mouse.y - smoothed.y) * smoothing;

                let dx = smoothed.x - xBase;
                let dy = smoothed.y - yBase;
                let dist2 = Math.exp(- (dx*dx*dx*dx + dy*dy*dy*dy)/sigma);
                let force = strength * dist2;
                let wave = Math.sin(t * timeSpeed +  i * 0.4) * 6;

                let x = xBase + dx * force * 0.25;
                let y = yBase + dy *  force * 0.25 + wave;

                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // --- Vertical lines ---
        for (let i = 0; i < vLineCount; i++) {
            const xBase = vLines[i].x;

            ctx.beginPath();
            for (let j = 0; j < pointsPerLine; j++) {
                const yBase = vLines[i].points[j] * h;
                smoothed.x += (mouse.x - smoothed.x) * smoothing;
                smoothed.y += (mouse.y - smoothed.y) * smoothing;

                let dx = smoothed.x - xBase;
                let dy = smoothed.y - yBase;
                let dist2 = Math.exp(- (dx*dx*dx*dx + dy*dy*dy*dy)/sigma);
                let force = strength * dist2;
                let wave = Math.sin(t * timeSpeed + i * 0.4) * 6;

                let x = xBase + dx * force * 0.25 + wave;
                let y = yBase + dy * force * 0.25;

                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();

