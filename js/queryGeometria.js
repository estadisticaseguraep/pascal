// js/queryGeometria.js
define([
    "esri/layers/GraphicsLayer",
    "esri/widgets/Sketch/SketchViewModel",
    "esri/Graphic",
    "esri/geometry/geometryEngine"
], function (GraphicsLayer, SketchViewModel, Graphic, geometryEngine) {

    return function iniciarQueryGeometria(view, map, onQuery, onClear) {

        // ── Capas ─────────────────────────────────────────────────────────────
        const sketchLayer = new GraphicsLayer({ title: "Watson Sketch", visible: true });
        const bufferLayer = new GraphicsLayer({ title: "Watson Buffer", visible: true });
        map.addMany([bufferLayer, sketchLayer]);

        // ── SketchViewModel ───────────────────────────────────────────────────
        const svm = new SketchViewModel({
            view,
            layer: sketchLayer,
            defaultUpdateOptions: { tool: "reshape", toggleToolOnClick: false },
            defaultCreateOptions: { hasZ: false }
        });

        let sketchGeometry = null;
        let bufferSize = 0;
        let activeType = null;

        const bufferSymbol = {
            type: "simple-fill",
            color: [0, 121, 193, 0.12],
            outline: { color: [0, 121, 193], width: 1.5 }
        };

        // ── Helpers ───────────────────────────────────────────────────────────
        function getQueryGeometry() {
            if (!sketchGeometry) return null;

            // Punto sin buffer → buffer mínimo de 1m para que intersecte
            if (sketchGeometry.type === "point" && bufferSize === 0) {
                return geometryEngine.geodesicBuffer(sketchGeometry, 1, "meters");
            }

            // Polígono, línea o punto con buffer > 0
            if (bufferSize > 0) {
                return geometryEngine.geodesicBuffer(sketchGeometry, bufferSize, "meters");
            }

            return sketchGeometry;
        }

        function updateBufferGraphic() {
            bufferLayer.removeAll();
            if (!sketchGeometry) return;
            const geom = getQueryGeometry();
            if (geom) {
                bufferLayer.add(new Graphic({ geometry: geom, symbol: bufferSymbol }));
            }
        }

        function runQuery() {
            updateBufferGraphic();
            onQuery(getQueryGeometry());
        }

        function setActiveBtn(type) {
            document.querySelectorAll(".watson-tool-btn").forEach(b => {
                b.classList.toggle("active", b.dataset.drawType === type);
            });
            activeType = type;
        }

        function clearAll() {
            sketchGeometry = null;
            bufferSize = 0;
            svm.cancel();
            sketchLayer.removeAll();
            bufferLayer.removeAll();
            setActiveBtn(null);

            const slider = document.getElementById("queryBufferSlider");
            const labelEl = document.getElementById("bufferValueLabel");
            const bufWrap = document.querySelector(".watson-buffer-wrap");
            if (slider) slider.value = 0;
            if (labelEl) labelEl.textContent = "0";
            if (bufWrap) bufWrap.style.display = "none"; 

            onClear();
        }

        // ── Eventos SketchViewModel ───────────────────────────────────────────
        svm.on("create", event => {
            if (event.state === "complete") {
                sketchGeometry = event.graphic.geometry;
                runQuery();
                svm.update([event.graphic], {
                    tool: sketchGeometry.type === "point" ? "move" : "reshape"
                });
            }
        });

        svm.on("update", event => {
            if (event.state === "complete") {
                sketchGeometry = event.graphics[0].geometry;
                runQuery();
            } else if (["active", "start"].includes(event.state)) {
                sketchGeometry = event.graphics[0]?.geometry ?? sketchGeometry;
                runQuery();
            }
        });

        // ── Botones de dibujo ─────────────────────────────────────────────────
        document.querySelectorAll(".watson-tool-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const type = btn.dataset.drawType;

                if (activeType === type) {
                    clearAll();
                    return;
                }

                clearAll();
                setActiveBtn(type);
                svm.create(type);

                const bufWrap = document.querySelector(".watson-buffer-wrap");
                if (bufWrap) bufWrap.style.display = "block";
            });
        });

        // ── Slider de buffer ──────────────────────────────────────────────────
        const slider = document.getElementById("queryBufferSlider");
        const labelEl = document.getElementById("bufferValueLabel");

        if (slider) {
            slider.addEventListener("input", () => {
                bufferSize = Number(slider.value);
                if (labelEl) labelEl.textContent = bufferSize;
                if (sketchGeometry) runQuery();
            });
        }

        // ── Botón limpiar ─────────────────────────────────────────────────────
        const clearBtn = document.querySelector(".watson-clear-btn");
        if (clearBtn) clearBtn.addEventListener("click", clearAll);

        // ── API pública ───────────────────────────────────────────────────────
        return { clearAll };
    };
});