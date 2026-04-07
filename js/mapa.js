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

    const map = mapSetup.crearMapaBase();
    const view = mapSetup.crearMapView(map);
    const timeSlider = mapSetup.crearTimeSlider(view);

    const conteoDiv = document.createElement("div");

    // ── Geometría de query activa ─────────────────────────────────────────────
    let queryGeomActiva = null;

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
            const resultadosCamaras = results.slice(capasIncidentes.length);

            resultadosIncidentes.sort((a, b) => b.count - a.count);

            const totalIncidentes = resultadosIncidentes.reduce((s, r) => s + r.count, 0);
            const totalCamaras = resultadosCamaras.reduce((s, r) => s + r.count, 0);
            const esFiltrado = !!geometry;

            // Preservar estado abierto/cerrado si ya existe el acordeón
            const abiertosAntes = {
                incidentes: conteoDiv.querySelector('#ca-incidentes')?.classList.contains('open') ?? false,
                camaras: conteoDiv.querySelector('#ca-camaras')?.classList.contains('open') ?? true
            };

            conteoDiv.innerHTML = `
        <style>
          .ca-wrap{width:280px;font-size:12px}
          .ca-banner{display:flex;align-items:center;gap:5px;font-size:11px;color:#d97706;
            background:rgba(251,191,36,0.15);border-radius:5px 5px 0 0;padding:4px 10px;
            border:1px solid rgba(251,191,36,0.3);border-bottom:none}
          .ca-banner.hidden{display:none}
          .ca-accordion{border:1px solid rgba(128,128,128,0.2);border-radius:5px;overflow:hidden}
          .ca-banner+.ca-accordion{border-radius:0 0 5px 5px}
          .ca-item{border-bottom:1px solid rgba(128,128,128,0.15)}
          .ca-item:last-child{border-bottom:none}
          .ca-header{all:unset;display:flex;align-items:center;justify-content:space-between;
            width:100%;padding:6px 10px;box-sizing:border-box;cursor:pointer;
            background:rgba(128,128,128,0.06)}
          .ca-header:hover{background:rgba(128,128,128,0.12)}
          .ca-title{font-weight:500;color:#f96d53}
          .ca-total{font-size:11px;color:#888;margin-left:5px;font-weight:400}
          .ca-chevron{width:11px;height:11px;transition:transform .2s;color:#888;flex-shrink:0}
          .ca-item.open .ca-chevron{transform:rotate(180deg)}
          .ca-body{display:none;padding:5px 10px 7px}
          .ca-item.open .ca-body{display:block}
          .ca-list{list-style:none;margin:0;padding:0}
          .ca-list li{display:flex;justify-content:space-between;padding:2px 0;
            border-bottom:1px solid rgba(128,128,128,0.08)}
          .ca-list li:last-child{border-bottom:none}
          .ca-list li .n{font-weight:500}
        </style>

        <div class="ca-wrap">
          <div class="ca-banner${esFiltrado ? "" : " hidden"}">⚠ Área filtrada activa</div>

          <div class="ca-accordion">
            <div class="ca-item${abiertosAntes.incidentes ? " open" : ""}" id="ca-incidentes">
              <button class="ca-header"
                onclick="document.getElementById('ca-incidentes').classList.toggle('open')">
                <span>
                  <span class="ca-title">Incidentes</span>
                  <span class="ca-total">${totalIncidentes}</span>
                </span>
                <svg class="ca-chevron" viewBox="0 0 16 16" fill="none"
                     stroke="currentColor" stroke-width="2.2">
                  <polyline points="3,5 8,11 13,5"/>
                </svg>
              </button>
              <div class="ca-body">
                <ul class="ca-list">
                  ${resultadosIncidentes.map(r =>
                `<li><span>${r.title}</span><span class="n">${r.count}</span></li>`
            ).join("")}
                </ul>
              </div>
            </div>

            <div class="ca-item${abiertosAntes.camaras ? " open" : ""}" id="ca-camaras">
              <button class="ca-header"
                onclick="document.getElementById('ca-camaras').classList.toggle('open')">
                <span>
                  <span class="ca-title">Cámaras</span>
                  <span class="ca-total">${totalCamaras}</span>
                </span>
                <svg class="ca-chevron" viewBox="0 0 16 16" fill="none"
                     stroke="currentColor" stroke-width="2.2">
                  <polyline points="3,5 8,11 13,5"/>
                </svg>
              </button>
              <div class="ca-body">
                <ul class="ca-list">
                  ${resultadosCamaras.map(r =>
                `<li><span>${r.title}</span><span class="n">${r.count}</span></li>`
            ).join("")}
                </ul>
              </div>
            </div>
          </div>
        </div>`;
        });
    }

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
        { layer: camarasSeguraILayer, label: "Segura EP Inactivas", color: "#9664c8" },
        { layer: camarasEcuLayer, label: "Cámaras ECU", color: "#9cff00" },
        { layer: camarasAtmLayer, label: "Cámaras ATM", color: "#ff9a00" }
    ];

    const capasBaseConfig = [
        { layer: subCircuitosLayer, label: "Sub Circuitos", color: "#4dd9ac" },
        { layer: distritosLayer, label: "Distritos", color: "#f96d53" }
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