require([
    "esri/layers/GraphicsLayer", "esri/widgets/Sketch/SketchViewModel", "esri/Graphic",
    "esri/time/TimeExtent", "js/capas", "js/uiSetup", "js/graficos", "js/mapSetup"
], function (
    GraphicsLayer, SketchViewModel, Graphic, TimeExtent,
    capasModule, setupUI, graficosModule, mapSetup
) {

    function ajustarTimeExtent(timeExtent) {
        if (!timeExtent || !timeExtent.start || !timeExtent.end) return timeExtent;
        const start = new Date(timeExtent.start);
        const end = new Date(timeExtent.end);
        return new TimeExtent({ start, end });
    }

    function traerGraficosAlFrente() {
        const total = map.layers.length;
        const indiceBuffer = map.layers.indexOf(bufferLayer);
        const indiceSketch = map.layers.indexOf(sketchLayer);

        if (indiceBuffer !== total - 2 || indiceSketch !== total - 1) {
            requestAnimationFrame(() => {
                const currentTotal = map.layers.length;
                map.reorder(bufferLayer, currentTotal - 2);
                map.reorder(sketchLayer, currentTotal - 1);
            });
        }
    }

    const { robosLayer, convivenciaLayer, extorsionLayer, p_armadaLayer, p_heridaLayer, secuestroLayer, sustanciasLayer, sicariatoLayer } = capasModule.crearCapas();
    const map = mapSetup.crearMapaBase();
    const view = mapSetup.crearMapView(map);
    const timeSlider = mapSetup.crearTimeSlider(view);

    const bufferLayer = new GraphicsLayer({ visible: false, title: "Capa de Filtro Circular" });
    const sketchLayer = new GraphicsLayer({ visible: false, title: "Capa de Controles" });
    
    map.addMany([bufferLayer, sketchLayer]);

    const sketchViewModel = new SketchViewModel({
        view: view,
        layer: sketchLayer
    });

    let conteoDiv = document.createElement("div");
    let centerGraphic, edgeGraphic, polylineGraphic, bufferGraphic;
    let centerGeometryStart;
    let distanceLabelGraphic = null;

    // ==================== SIMBOLOGÍA ====================
    function createPointSymbol(color) { return { type: "simple-marker", style: "square", color: color, size: 10 }; }
    function createLineSymbol() { return { type: "simple-line", color: [255, 255, 255], width: 2 }; }
    function createBufferSymbol() { return { type: "simple-fill", color: [255, 255, 255, 0.4], outline: { color: [255, 255, 255], width: 2 } }; }
    function createDistanceLabelSymbol() { return { type: "text", color: "white", haloColor: "black", haloSize: 2, font: { size: 14, weight: "bold" }, horizontalAlignment: "left", verticalAlignment: "middle", xoffset: 10 }; }

    function updateDistanceLabel(distance, point) {
        const distanceText = `${distance.toFixed(0)} m`;
        if (distanceLabelGraphic) {
            distanceLabelGraphic.symbol.text = distanceText;
            distanceLabelGraphic.geometry = point;
        } else {
            const symbol = createDistanceLabelSymbol();
            symbol.text = distanceText;
            distanceLabelGraphic = new Graphic({ geometry: point, symbol: symbol });
            bufferLayer.add(distanceLabelGraphic);
        }
    }

    sketchViewModel.on("update", async function (event) {
        if (!bufferLayer.visible) return;

        if (event.toolEventInfo && event.toolEventInfo.mover?.attributes?.role === "edge") {
            if (event.toolEventInfo.type === "move-start") {
                centerGeometryStart = centerGraphic.geometry;
            } else {
                centerGraphic.geometry = centerGeometryStart;
            }
        }

        if (centerGraphic && edgeGraphic && bufferGraphic && polylineGraphic) {
            const { distance, midPoint, bufferGeometry } = await graficosModule.updateBuffer(centerGraphic, edgeGraphic, bufferGraphic, polylineGraphic, view);
            updateDistanceLabel(distance, midPoint);
            actualizarTodo(ajustarTimeExtent(timeSlider.timeExtent), bufferGeometry);
        }

        if (event.state === "complete") {
            sketchViewModel.update([centerGraphic, edgeGraphic], { tool: "move" });
        }
    });

    view.when().then(() => {
        graficosModule.drawDraggableCircle(
            view, sketchViewModel, bufferLayer, createPointSymbol, createLineSymbol, createBufferSymbol
        ).then(async graphics => {
            centerGraphic = graphics.centerGraphic;
            edgeGraphic = graphics.edgeGraphic;
            polylineGraphic = graphics.polylineGraphic;
            bufferGraphic = graphics.bufferGraphic;

            const { distance, midPoint } = await graficosModule.updateBuffer(centerGraphic, edgeGraphic, bufferGraphic, polylineGraphic, view);
            updateDistanceLabel(distance, midPoint);

            sketchViewModel.cancel(); 
            actualizarTodo(ajustarTimeExtent(timeSlider.timeExtent), null); 
        });
    });

    map.layers.on("change", (event) => {
        if (event.added || event.moved) {
            traerGraficosAlFrente();
        }
    });

    function crearLayerConfig(layer, visible, iconId) {
        return { layer, visible, iconElement: document.getElementById(iconId) };
    }

    const recursos = [ crearLayerConfig(null, false, 'iconQuery') ];

    const incidentes = [
        crearLayerConfig(robosLayer, false, 'iconRobos'),
        crearLayerConfig(convivenciaLayer, false, 'iconConvivencia'),
        crearLayerConfig(extorsionLayer, false, 'iconExtorsion'),
        crearLayerConfig(p_armadaLayer, false, 'iconP_Armada'),
        crearLayerConfig(p_heridaLayer, false, 'iconP_Herida'),
        crearLayerConfig(secuestroLayer, false, 'iconSecuestro'),
        crearLayerConfig(sustanciasLayer, false, 'iconSustancias'),
        crearLayerConfig(sicariatoLayer, false, 'iconSicariato')
    ];

    function actualizarTodo(timeExtent, bufferGeometry = null) {
        actualizarConteo(timeExtent, bufferGeometry);
    }

    timeSlider.watch("timeExtent", function (newTimeExtent) {
        const adjustedTimeExtent = ajustarTimeExtent(newTimeExtent);
        const currentBuffer = bufferLayer.visible && bufferGraphic ? bufferGraphic.geometry : null;
        actualizarTodo(adjustedTimeExtent, currentBuffer);
    });

    function contarEntidades(layer, options = {}) {
        const query = layer.createQuery();
        if (options.timeExtent) {
            const pad = (n) => n < 10 ? '0' + n : n;
            const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            query.where = `Fecha >= timestamp '${formatDate(options.timeExtent.start)}' AND Fecha <= timestamp '${formatDate(options.timeExtent.end)}'`;
        } else {
            query.where = "1=1";
        }
        if (options.geometry) {
            query.geometry = options.geometry;
            query.spatialRelationship = "intersects";
        }
        return layer.queryFeatureCount(query).then(count => ({ title: layer.title, count })).catch(() => ({ title: layer.title, count: 0 }));
    }

    function actualizarConteo(timeExtent = null, geometry = null) {
        const options = { timeExtent, geometry };
        const capasAConsultar = [robosLayer, convivenciaLayer, extorsionLayer, p_armadaLayer, p_heridaLayer, secuestroLayer, sustanciasLayer, sicariatoLayer];

        Promise.all(capasAConsultar.map(lyr => contarEntidades(lyr, options))).then(results => {
            const totalIncidentes = results.reduce((sum, item) => sum + item.count, 0);
            results.sort((a, b) => b.count - a.count);

            const tituloConteo = geometry ? "Incidentes Filtrados" : "Incidentes";
            const colorFondo = geometry ? "rgba(255, 171, 61, 0.4)" : "transparent";

            conteoDiv.innerHTML = `
                <div style="padding: 10px; width: 260px; font-size: 0.85em; background-color: ${colorFondo}; border-radius: 4px;">
                    <h4 style="margin: 0; color: #f96d53;">${tituloConteo}: ${totalIncidentes}</h4>
                    <ul style="padding-left: 1.1em; margin: 0;">
                        ${results.map(r => `<li><strong>${r.title}:</strong> ${r.count}</li>`).join("")}
                    </ul>
                </div>
            `;
        });
    }

    setupUI(view, { recursos, incidentes, conteoDiv });

    [...recursos, ...incidentes].forEach(layerObject => {
        layerObject.iconElement.onclick = async function () {

            if (layerObject.iconElement.id === 'iconQuery') {
                const isNowVisible = !bufferLayer.visible;
                bufferLayer.visible = isNowVisible;
                sketchLayer.visible = isNowVisible;
                layerObject.iconElement.classList.toggle('active');

                if (isNowVisible) {
                    traerGraficosAlFrente();
                    if (centerGraphic && edgeGraphic) {
                        await sketchViewModel.update([centerGraphic, edgeGraphic], { tool: "move" });
                    }
                } else {
                    sketchViewModel.cancel();
                }
                actualizarTodo(ajustarTimeExtent(timeSlider.timeExtent), isNowVisible ? bufferGraphic?.geometry : null);
                return;
            }

            layerObject.visible = !layerObject.visible;
            if (layerObject.visible) {
                map.add(layerObject.layer);
            } else {
                map.remove(layerObject.layer);
            }
            layerObject.iconElement.classList.toggle('active');
        };
    });

    [robosLayer, convivenciaLayer, extorsionLayer, p_armadaLayer, p_heridaLayer, secuestroLayer, sustanciasLayer, sicariatoLayer].forEach(layer => {
        layer.definitionExpression = null;
    });
});