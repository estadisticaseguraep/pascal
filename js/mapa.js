require([
    "esri/layers/GraphicsLayer", "esri/widgets/Sketch/SketchViewModel", "esri/Graphic",
    "esri/time/TimeExtent", "js/capas", "js/uiSetup", "js/graficos", "js/mapSetup"
], function (
    GraphicsLayer, SketchViewModel, Graphic, TimeExtent,
    capasModule, setupUI, graficosModule, mapSetup
) {

    // ── Helpers ───────────────────────────────────────────────────────────────
    function ajustarTimeExtent(timeExtent) {
        if (!timeExtent?.start || !timeExtent?.end) return timeExtent;
        return new TimeExtent({ start: new Date(timeExtent.start), end: new Date(timeExtent.end) });
    }

    function traerGraficosAlFrente() {
        requestAnimationFrame(() => {
            const n = map.layers.length;
            const capasAlFrente = [
                rutaModeloLayer, rutaSurLayer, rutaPorteteLayer,
                rutaPascualesLayer, rutaNuevaProsperinaLayer,
                rutaFloridaLayer, rutaEsterosLayer, rutaCeibosLayer,
                ruta9OctLayer,
                camarasActivasLayer, camarasVandalizadasLayer,
                camarasSeguraALayer, camarasSeguraILayer,
                bufferLayer, sketchLayer
            ].filter(l => map.layers.includes(l));

            capasAlFrente.forEach((layer, i) => {
                map.reorder(layer, n - capasAlFrente.length + i);
            });
        });
    }

    // ── Capas ─────────────────────────────────────────────────────────────────
    const {
        robosLayer, convivenciaLayer, extorsionLayer,
        p_armadaLayer, p_heridaLayer, secuestroLayer,
        sustanciasLayer, sicariatoLayer,
        rutaModeloLayer, rutaSurLayer, rutaPorteteLayer,
        rutaPascualesLayer, rutaNuevaProsperinaLayer,
        rutaFloridaLayer, rutaEsterosLayer, rutaCeibosLayer,
        ruta9OctLayer,
        camarasActivasLayer, camarasVandalizadasLayer,
        camarasSeguraALayer, camarasSeguraILayer,
        subCircuitosLayer, distritosLayer
    } = capasModule.crearCapas();

    const map = mapSetup.crearMapaBase();
    const view = mapSetup.crearMapView(map);
    const timeSlider = mapSetup.crearTimeSlider(view);

    const bufferLayer = new GraphicsLayer({ visible: false, title: "Capa de Filtro Circular" });
    const sketchLayer = new GraphicsLayer({ visible: false, title: "Capa de Controles" });
    map.addMany([bufferLayer, sketchLayer]);

    const sketchViewModel = new SketchViewModel({ view, layer: sketchLayer });

    let conteoDiv = document.createElement("div");
    let centerGraphic, edgeGraphic, polylineGraphic, bufferGraphic;
    let centerGeometryStart, distanceLabelGraphic = null;

    const createPointSymbol = color => ({ type: "simple-marker", style: "square", color, size: 10 });
    const createLineSymbol = () => ({ type: "simple-line", color: [255, 255, 255], width: 2 });
    const createBufferSymbol = () => ({ type: "simple-fill", color: [255, 255, 255, 0.1], outline: { color: [255, 255, 255], width: 2 } });
    const createDistanceLabelSymbol = () => ({
        type: "text", color: "white", haloColor: "black", haloSize: 2,
        font: { size: 14, weight: "bold" }, horizontalAlignment: "left",
        verticalAlignment: "middle", xoffset: 10
    });

    function updateDistanceLabel(distance, point) {
        const text = `${distance.toFixed(0)} m`;
        if (distanceLabelGraphic) {
            distanceLabelGraphic.symbol.text = text;
            distanceLabelGraphic.geometry = point;
        } else {
            const symbol = createDistanceLabelSymbol();
            symbol.text = text;
            distanceLabelGraphic = new Graphic({ geometry: point, symbol });
            bufferLayer.add(distanceLabelGraphic);
        }
    }

    sketchViewModel.on("update", async function (event) {
        if (!bufferLayer.visible) return;
        if (event.toolEventInfo?.mover?.attributes?.role === "edge") {
            if (event.toolEventInfo.type === "move-start") centerGeometryStart = centerGraphic.geometry;
            else centerGraphic.geometry = centerGeometryStart;
        }
        if (centerGraphic && edgeGraphic && bufferGraphic && polylineGraphic) {
            const { distance, midPoint, bufferGeometry } = await graficosModule.updateBuffer(
                centerGraphic, edgeGraphic, bufferGraphic, polylineGraphic, view
            );
            updateDistanceLabel(distance, midPoint);
            actualizarTodo(ajustarTimeExtent(timeSlider.timeExtent), bufferGeometry);
        }
        if (event.state === "complete")
            sketchViewModel.update([centerGraphic, edgeGraphic], { tool: "move" });
    });

    view.when().then(() => {
        graficosModule.drawDraggableCircle(
            view, sketchViewModel, bufferLayer, createPointSymbol, createLineSymbol, createBufferSymbol
        ).then(async graphics => {
            ({ centerGraphic, edgeGraphic, polylineGraphic, bufferGraphic } = graphics);
            const { distance, midPoint } = await graficosModule.updateBuffer(
                centerGraphic, edgeGraphic, bufferGraphic, polylineGraphic, view
            );
            updateDistanceLabel(distance, midPoint);
            sketchViewModel.cancel();
            actualizarTodo(ajustarTimeExtent(timeSlider.timeExtent), null);
        });
    });

    map.layers.on("change", e => { if (e.added || e.moved) traerGraficosAlFrente(); });

    // ── Incidentes UI ─────────────────────────────────────────────────────────
    const incidentes = [
        { layer: robosLayer, iconElement: document.getElementById('iconRobos') },
        { layer: convivenciaLayer, iconElement: document.getElementById('iconConvivencia') },
        { layer: extorsionLayer, iconElement: document.getElementById('iconExtorsion') },
        { layer: p_armadaLayer, iconElement: document.getElementById('iconP_Armada') },
        { layer: p_heridaLayer, iconElement: document.getElementById('iconP_Herida') },
        { layer: secuestroLayer, iconElement: document.getElementById('iconSecuestro') },
        { layer: sustanciasLayer, iconElement: document.getElementById('iconSustancias') },
        { layer: sicariatoLayer, iconElement: document.getElementById('iconSicariato') }
    ].map(o => ({ ...o, visible: false }));

    const recursos = [{ layer: null, visible: false, iconElement: document.getElementById('iconQuery') }];

    // ── Conteo ────────────────────────────────────────────────────────────────
    function actualizarTodo(timeExtent, bufferGeometry = null) {
        actualizarConteo(timeExtent, bufferGeometry);
    }

    timeSlider.watch("timeExtent", newTE => {
        const adjustedTE = ajustarTimeExtent(newTE);
        const geom = bufferLayer.visible && bufferGraphic ? bufferGraphic.geometry : null;
        actualizarTodo(adjustedTE, geom);
    });

    function contarEntidades(layer, { timeExtent, geometry } = {}) {
        const query = layer.createQuery();
        if (timeExtent) {
            const pad = n => n < 10 ? '0' + n : n;
            const fmt = d =>
                `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
                `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            query.where = `Fecha >= timestamp '${fmt(timeExtent.start)}' AND Fecha <= timestamp '${fmt(timeExtent.end)}'`;
        } else {
            query.where = "1=1";
        }
        if (geometry) { query.geometry = geometry; query.spatialRelationship = "intersects"; }
        return layer.queryFeatureCount(query)
            .then(count => ({ title: layer.title, count }))
            .catch(() => ({ title: layer.title, count: 0 }));
    }

    function actualizarConteo(timeExtent = null, geometry = null) {
        const capasIncidentes = [
            robosLayer, convivenciaLayer, extorsionLayer,
            p_armadaLayer, p_heridaLayer, secuestroLayer,
            sustanciasLayer, sicariatoLayer
        ];
        const capasCamaras = [
            camarasActivasLayer, camarasVandalizadasLayer,
            camarasSeguraALayer, camarasSeguraILayer
        ];

        function contarCamara(layer, geometry) {
            const query = layer.createQuery();
            query.where = "1=1";
            if (geometry) { query.geometry = geometry; query.spatialRelationship = "intersects"; }
            return layer.queryFeatureCount(query)
                .then(count => ({ title: layer.title, count }))
                .catch(() => ({ title: layer.title, count: 0 }));
        }

        Promise.all([
            ...capasIncidentes.map(l => contarEntidades(l, { timeExtent, geometry })),
            ...capasCamaras.map(l => contarCamara(l, geometry))
        ]).then(results => {
            const resultadosIncidentes = results.slice(0, capasIncidentes.length);
            const resultadosCamaras = results.slice(capasIncidentes.length);

            resultadosIncidentes.sort((a, b) => b.count - a.count);

            const totalIncidentes = resultadosIncidentes.reduce((s, r) => s + r.count, 0);
            const totalCamaras = resultadosCamaras.reduce((s, r) => s + r.count, 0);

            const esFiltrado = !!geometry;
            const colorFondo = esFiltrado ? "rgba(255, 171, 61, 0.4)" : "transparent";
            const tituloLabel = esFiltrado ? "Incidentes Filtrados" : "Incidentes";

            conteoDiv.innerHTML = `
            <div style="padding:10px;width:100%;box-sizing:border-box;font-size:0.85em;background-color:${colorFondo};border-radius:4px;">
                <h4 style="margin:0 0 6px;color:#f96d53;">${tituloLabel}: ${totalIncidentes}</h4>
                <ul style="padding-left:1.1em;margin:0 0 8px;">
                    ${resultadosIncidentes.map(r =>
                `<li><strong>${r.title}:</strong> ${r.count}</li>`
            ).join("")}
                </ul>
                <div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:6px;">
                    <strong style="color:#f96d53;">Cámaras${esFiltrado ? " en área" : ""}: ${totalCamaras}</strong>
                    <ul style="padding-left:1.1em;margin:4px 0 0;">
                        ${resultadosCamaras.map(r =>
                `<li><strong>${r.title}:</strong> ${r.count}</li>`
            ).join("")}
                    </ul>
                </div>
            </div>`;
        });
    }

    // ── UI: accordion + slots ─────────────────────────────────────────────────
    // ❶ setupUI retorna el objeto con agregarCheckboxes
    const ui = setupUI(view, { recursos, incidentes, conteoDiv });

    // ❷ onclicks — sin cambios, misma lógica de siempre
    [...recursos, ...incidentes].forEach(obj => {
        obj.iconElement.onclick = async function () {
            if (obj.iconElement.id === 'iconQuery') {
                const nowVisible = !bufferLayer.visible;
                bufferLayer.visible = sketchLayer.visible = nowVisible;
                obj.iconElement.classList.toggle('active');
                if (nowVisible) {
                    traerGraficosAlFrente();
                    if (centerGraphic && edgeGraphic)
                        await sketchViewModel.update([centerGraphic, edgeGraphic], { tool: "move" });
                } else {
                    sketchViewModel.cancel();
                }
                actualizarTodo(
                    ajustarTimeExtent(timeSlider.timeExtent),
                    nowVisible ? bufferGraphic?.geometry : null
                );
                return;
            }
            obj.visible = !obj.visible;
            obj.visible ? map.add(obj.layer) : map.remove(obj.layer);
            obj.iconElement.classList.toggle('active');
        };
    });

    // ── Configuración de capas para el accordion ──────────────────────────────
    const rutasConfig = [
        { layer: rutaModeloLayer, label: "Modelo", color: "#ffff33" },
        { layer: rutaSurLayer, label: "Sur", color: "#ff6464" },
        { layer: rutaPorteteLayer, label: "Portete", color: "#33ccff" },
        { layer: rutaPascualesLayer, label: "Pascuales", color: "#64ff96" },
        { layer: rutaNuevaProsperinaLayer, label: "Nueva Prosperina", color: "#ff9633" },
        { layer: rutaFloridaLayer, label: "Florida", color: "#c864ff" },
        { layer: rutaEsterosLayer, label: "Esteros", color: "#33ffc8" },
        { layer: rutaCeibosLayer, label: "Ceibos", color: "#ffc833" },
        { layer: ruta9OctLayer, label: "9 de Octubre", color: "#ff3396" }
    ];

    const camarasConfig = [
        { layer: camarasActivasLayer, label: "Activas", color: "#00dc78" },
        { layer: camarasVandalizadasLayer, label: "Vandalizadas", color: "#ff5050" },
        { layer: camarasSeguraALayer, label: "Segura EP Activas", color: "#00b4ff" },
        { layer: camarasSeguraILayer, label: "Segura EP Inactivas", color: "#9664c8" }
    ];

    const capasBaseConfig = [
        { layer: subCircuitosLayer, label: "Sub Circuitos", color: "#4dd9ac" },
        { layer: distritosLayer, label: "Distritos", color: "#f96d53" }
    ];

    // ❸ Agregar todas al mapa inicialmente invisibles
    [...rutasConfig, ...camarasConfig, ...capasBaseConfig].forEach(cfg => {
        cfg.layer.visible = false;
        map.add(cfg.layer);
    });

    // ❹ Inyectar checkboxes en los slots del accordion
    //    agregarCheckboxes ya llama traerGraficosAlFrente via onChange
    ui.agregarCheckboxes("rutas-slot", rutasConfig.map(c => ({
        ...c,
        onChange: (checked, layer) => {
            traerGraficosAlFrente();
            if (checked && layer) {
                layer.when(() => {
                    layer.queryExtent().then(result => {
                        if (result.extent) {
                            view.goTo({
                                target: result.extent.expand(1.3)
                            }, {
                                duration: 1200,
                                easing: "ease-in-out"
                            });
                        }
                    });
                });
            }
        }
    })));

    ui.agregarCheckboxes("camaras-slot", camarasConfig.map(c => ({
        ...c,
        onChange: () => traerGraficosAlFrente()
    })));

    ui.agregarCheckboxes("zonas-slot", capasBaseConfig.map(c => ({
        ...c,
        onChange: () => traerGraficosAlFrente()
    })));
});