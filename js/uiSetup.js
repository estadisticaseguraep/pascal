// js/uiSetup.js
define([
    "esri/widgets/Expand",
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery"
], function (Expand, Fullscreen, BasemapGallery) {

    return function setupUI(view, opciones) {
        const { recursos, incidentes, conteoDiv } = opciones;

        // ── 1. Time Slider — top-right ────────────────────────────────────────
        const tsEl = document.getElementById("timeSliderDiv");
        if (tsEl) {
            view.ui.add(new Expand({
                view,
                content: tsEl,
                expandIcon: "timer",
                expandTooltip: "Regulador de tiempo",
                expanded: false
            }), "top-right");
        }

        // ── 2. Fullscreen — top-right ─────────────────────────────────────────
        view.ui.add(new Fullscreen({ view }), "top-right");

        // ── 3. BasemapGallery — top-right ─────────────────────────────────────
        view.ui.add(new Expand({
            view,
            content: new BasemapGallery({ view }),
            expandIcon: "basemap",
            expandTooltip: "Cambiar mapa base",
            expanded: false
        }), "top-right");

        // ── 4. Estadísticas / Conteo — bottom-right ───────────────────────────
        view.ui.add(new Expand({
            view,
            content: conteoDiv,
            expandIcon: "graph-bar",
            expandTooltip: "Estadísticas",
            expanded: true
        }), "bottom-right");

        // ── 5. Panel con tabs — top-left ──────────────────────────────────────
        const TABS = [
            { id: "incidentes", label: "Incidentes", icon: "layers",       isEmoji: false },
            { id: "rutas",      label: "Rutas",      icon: "road-sign",    isEmoji: false },
            { id: "camaras",    label: "Cámaras",    icon: "video",        isEmoji: false },
            { id: "zonas",      label: "Zonas",      icon: "map-pin",      isEmoji: false },
            { id: "watson",     label: "Watson",     icon: "🤖",           isEmoji: true  }
        ];

        const panel  = document.createElement("div");
        panel.className = "cp-panel";

        const tabBar = document.createElement("div");
        tabBar.className = "cp-tabs";

        const body   = document.createElement("div");
        body.className = "cp-body";

        const panes  = {};

        TABS.forEach(({ id, label, icon, isEmoji }) => {
            const tab = document.createElement("div");
            tab.className = "cp-tab" + (id === "incidentes" ? " active" : "");
            tab.dataset.tab = id;

            if (isEmoji) {
                const emojiSpan = document.createElement("span");
                emojiSpan.className = "cp-tab-emoji";
                emojiSpan.textContent = icon;
                tab.appendChild(emojiSpan);
            } else {
                const calciteIcon = document.createElement("calcite-icon");
                calciteIcon.setAttribute("icon", icon);
                calciteIcon.setAttribute("scale", "s");
                tab.appendChild(calciteIcon);
            }

            const labelSpan = document.createElement("span");
            labelSpan.textContent = label;
            tab.appendChild(labelSpan);

            tab.addEventListener("click", () => {
                tabBar.querySelectorAll(".cp-tab").forEach(t => t.classList.remove("active"));
                body.querySelectorAll(".cp-pane").forEach(p => p.classList.remove("active"));
                tab.classList.add("active");
                panes[id].classList.add("active");
            });

            tabBar.appendChild(tab);

            const pane = document.createElement("div");
            pane.className = "cp-pane" + (id === "incidentes" ? " active" : "");
            panes[id] = pane;
            body.appendChild(pane);
        });

        // ── Pane: Incidentes ──────────────────────────────────────────────────
        const incidenteLabels = {
            iconRobos:       "Robos",
            iconConvivencia: "Convivencia",
            iconExtorsion:   "Extorsión",
            iconP_Armada:    "Persona Armada",
            iconP_Herida:    "Persona Herida",
            iconSecuestro:   "Secuestro",
            iconSustancias:  "Sustancias",
            iconSicariato:   "Muertes Violentas"
        };

        const incList = document.createElement("div");

        incidentes.forEach(obj => {
            obj.iconElement.style.display = "none";

            const row = document.createElement("label");
            row.className = "cp-row";

            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.checked = obj.visible ?? false;
            chk.style.accentColor = "#f96d53";
            chk.addEventListener("change", () => {
                obj.iconElement.click();
            });

            obj.iconElement.addEventListener("click", () => {
                setTimeout(() => {
                    chk.checked = obj.iconElement.classList.contains("active");
                }, 0);
            });

            const dot = document.createElement("span");
            dot.className = "cp-dot";
            dot.style.background = "#f96d53";

            const span = document.createElement("span");
            span.textContent = incidenteLabels[obj.iconElement.id] || obj.layer?.title || "";

            row.append(chk, dot, span);
            incList.appendChild(row);
        });

        panes["incidentes"].appendChild(incList);

        // ── Panes: slots rutas / cámaras / zonas ──────────────────────────────
        ["rutas", "camaras", "zonas"].forEach(id => {
            const slot = document.createElement("div");
            slot.setAttribute("data-slot", `${id}-slot`);
            panes[id].appendChild(slot);
        });

        // ── Pane: Watson ──────────────────────────────────────────────────────
        const iconQueryEl = document.getElementById("iconQuery");
        if (iconQueryEl) {
            iconQueryEl.style.display = "none";

            const watsonBtn = document.createElement("div");
            watsonBtn.className = "cp-watson-btn";

            const watsonIcon = document.createElement("div");
            watsonIcon.className = "cp-watson-icon";

            const watsonLbl = document.createElement("span");
            watsonLbl.textContent = "Activar Radar";

            watsonBtn.append(watsonIcon, watsonLbl);

            watsonBtn.addEventListener("click", () => {
                iconQueryEl.click();
                setTimeout(() => {
                    const isActive = iconQueryEl.classList.contains("active");
                    watsonBtn.classList.toggle("active", isActive);
                    watsonLbl.textContent = isActive ? "Desactivar Radar" : "Activar Radar";
                }, 0);
            });

            panes["watson"].append(watsonBtn, iconQueryEl);
        }

        panel.append(tabBar, body);

        view.ui.add(new Expand({
            view,
            content: panel,
            expandIcon: "layers",
            expandTooltip: "Panel de Control",
            expanded: true
        }), "top-left");

        // ── API pública ───────────────────────────────────────────────────────
        return {
            agregarCheckboxes(slotId, items) {
                const slot = panel.querySelector(`[data-slot="${slotId}"]`);
                if (!slot) return;
                slot.innerHTML = "";
                items.forEach(({ layer, label, color = "#333", onChange }) => {
                    const row = document.createElement("label");
                    row.className = "cp-row";

                    const chk = document.createElement("input");
                    chk.type = "checkbox";
                    chk.checked = layer?.visible ?? false;
                    chk.style.accentColor = color;
                    chk.addEventListener("change", () => {
                        if (layer) layer.visible = chk.checked;
                        if (onChange) onChange(chk.checked, layer);
                    });

                    const dot = document.createElement("span");
                    dot.className = "cp-dot";
                    dot.style.background = color;

                    const span = document.createElement("span");
                    span.textContent = label;

                    row.append(chk, dot, span);
                    slot.appendChild(row);
                });
            }
        };
    };
});