// mapa.js
require([
    "esri/layers/GraphicsLayer", "esri/Graphic",
    "esri/time/TimeExtent", "js/capas", "js/uiSetup", "js/mapSetup",
    "js/queryGeometria"
], function (
    GraphicsLayer, Graphic, TimeExtent,
    capasModule, setupUI, mapSetup,
    iniciarQueryGeometria
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
                camarasActivasLayer, camarasVandalizadasLayer, camarasEcuLayer, camarasAtmLayer,
                camarasSeguraALayer, camarasSeguraILayer
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
        camarasActivasLayer, camarasVandalizadasLayer, camarasEcuLayer, camarasAtmLayer,
        camarasSeguraALayer, camarasSeguraILayer,
        subCircuitosLayer, distritosLayer
    } = capasModule.crearCapas();

    const map     = mapSetup.crearMapaBase();
    const view    = mapSetup.crearMapView(map);
    const timeSlider = mapSetup.crearTimeSlider(view);

    const conteoDiv = document.createElement("div");

    // ── Geometría de query activa (la gestiona queryGeometria.js) ─────────────
    let queryGeomActiva = null;   // se actualiza via callbacks

    // ── Conteo ────────────────────────────────────────────────────────────────
    function actualizarTodo(timeExtent, geometry = null) {
        actualizarConteo(timeExtent, geometry);
    }

    timeSlider.watch("timeExtent", newTE => {
        actualizarTodo(ajustarTimeExtent(newTE), queryGeomActiva);
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
            camarasActivasLayer, camarasVandalizadasLayer, camarasEcuLayer, camarasAtmLayer,
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
            const resultadosCamaras    = results.slice(capasIncidentes.length);

            resultadosIncidentes.sort((a, b) => b.count - a.count);

            const totalIncidentes = resultadosIncidentes.reduce((s, r) => s + r.count, 0);
            const totalCamaras    = resultadosCamaras.reduce((s, r) => s + r.count, 0);

            const esFiltrado   = !!geometry;
            const colorFondo   = esFiltrado ? "rgba(255, 171, 61, 0.4)" : "transparent";
            const tituloLabel  = esFiltrado ? "Incidentes Filtrados" : "Incidentes";

            conteoDiv.innerHTML = `
            <div style="padding:10px;width:100%;box-sizing:border-box;font-size:0.85em;
                        background-color:${colorFondo};border-radius:4px;">
                <h4 style="margin:0 0 6px;color:#f96d53;">${tituloLabel}: ${totalIncidentes}</h4>
                <ul style="padding-left:1.1em;margin:0 0 8px;">
                    ${resultadosIncidentes.map(r =>
                        `<li><strong>${r.title}:</strong> ${r.count}</li>`
                    ).join("")}
                </ul>
                <div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:6px;">
                    <strong style="color:#f96d53;">
                        Cámaras${esFiltrado ? " en área" : ""}: ${totalCamaras}
                    </strong>
                    <ul style="padding-left:1.1em;margin:4px 0 0;">
                        ${resultadosCamaras.map(r =>
                            `<li><strong>${r.title}:</strong> ${r.count}</li>`
                        ).join("")}
                    </ul>
                </div>
            </div>`;
        });
    }

    // ── Incidentes UI ─────────────────────────────────────────────────────────
    const incidentes = [
        { layer: robosLayer,       iconElement: document.getElementById('iconRobos')       },
        { layer: convivenciaLayer, iconElement: document.getElementById('iconConvivencia') },
        { layer: extorsionLayer,   iconElement: document.getElementById('iconExtorsion')   },
        { layer: p_armadaLayer,    iconElement: document.getElementById('iconP_Armada')    },
        { layer: p_heridaLayer,    iconElement: document.getElementById('iconP_Herida')    },
        { layer: secuestroLayer,   iconElement: document.getElementById('iconSecuestro')   },
        { layer: sustanciasLayer,  iconElement: document.getElementById('iconSustancias')  },
        { layer: sicariatoLayer,   iconElement: document.getElementById('iconSicariato')   }
    ].map(o => ({ ...o, visible: false }));

    const recursos = [];

    // ── UI ────────────────────────────────────────────────────────────────────
    const ui = setupUI(view, { recursos, incidentes, conteoDiv });

    // Clicks de incidentes
    incidentes.forEach(obj => {
        obj.iconElement.onclick = function () {
            obj.visible = !obj.visible;
            obj.visible ? map.add(obj.layer) : map.remove(obj.layer);
            obj.iconElement.classList.toggle('active');
        };
    });

    // ── Query por geometría ───────────────────────────────────────────────────
    view.when().then(() => {
        iniciarQueryGeometria(
            view,
            map,
            (geom) => {           // onQuery
                queryGeomActiva = geom;
                actualizarTodo(ajustarTimeExtent(timeSlider.timeExtent), geom);
            },
            () => {               // onClear
                queryGeomActiva = null;
                actualizarTodo(ajustarTimeExtent(timeSlider.timeExtent), null);
            }
        );

        // Conteo inicial sin filtro
        actualizarTodo(ajustarTimeExtent(timeSlider.timeExtent), null);
    });

    map.layers.on("change", e => { if (e.added || e.moved) traerGraficosAlFrente(); });

    // ── Configuración de capas para el accordion ──────────────────────────────
    const rutasConfig = [
        { layer: rutaModeloLayer,          label: "Modelo",            color: "#ffff33" },
        { layer: rutaSurLayer,             label: "Sur",               color: "#ff6464" },
        { layer: rutaPorteteLayer,         label: "Portete",           color: "#33ccff" },
        { layer: rutaPascualesLayer,       label: "Pascuales",         color: "#64ff96" },
        { layer: rutaNuevaProsperinaLayer, label: "Nueva Prosperina",  color: "#ff9633" },
        { layer: rutaFloridaLayer,         label: "Florida",           color: "#c864ff" },
        { layer: rutaEsterosLayer,         label: "Esteros",           color: "#33ffc8" },
        { layer: rutaCeibosLayer,          label: "Ceibos",            color: "#ffc833" },
        { layer: ruta9OctLayer,            label: "9 de Octubre",      color: "#ff3396" }
    ];

    const camarasConfig = [
        { layer: camarasActivasLayer,      label: "Activas",            color: "#00dc78" },
        { layer: camarasVandalizadasLayer, label: "Vandalizadas",       color: "#ff5050" },
        { layer: camarasSeguraALayer,      label: "Segura EP Activas",  color: "#00b4ff" },
        { layer: camarasSeguraILayer,      label: "Segura EP Inactivas",color: "#9664c8" },
        { layer: camarasEcuLayer,          label: "Cámaras ECU",        color: "#9cff00" },
        { layer: camarasAtmLayer,          label: "Cámaras ATM",        color: "#ff9a00" }
    ];

    const capasBaseConfig = [
        { layer: subCircuitosLayer, label: "Sub Circuitos", color: "#4dd9ac" },
        { layer: distritosLayer,    label: "Distritos",     color: "#f96d53" }
    ];

    [...rutasConfig, ...camarasConfig, ...capasBaseConfig].forEach(cfg => {
        cfg.layer.visible = false;
        map.add(cfg.layer);
    });

    ui.agregarCheckboxes("rutas-slot", rutasConfig.map(c => ({
        ...c,
        onChange: (checked, layer) => {
            traerGraficosAlFrente();
            if (checked && layer) {
                layer.when(() => {
                    layer.queryExtent().then(result => {
                        if (result.extent) {
                            view.goTo({ target: result.extent.expand(1.3) },
                                      { duration: 1200, easing: "ease-in-out" });
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