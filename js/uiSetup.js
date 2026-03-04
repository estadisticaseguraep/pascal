define([
    "esri/widgets/Expand",
    "esri/widgets/Fullscreen"
], function (Expand, Fullscreen) {

    return function setupUI(view, opciones) {
        const { recursos, incidentes, conteoDiv } = opciones;

        const widgets = [
            {
                position: "top-left",
                elementId: "iconQuery",
                expandIcon: "magnifying-glass-plus",
                tooltip: "Consulta Espacial",
                autoExpand: true
            },
            {
                position: "bottom-left",
                elementId: "iconIncidentes",
                expandIcon: "layers",
                tooltip: "Capas de Incidentes",
                autoExpand: true
            },
            {
                position: "top-right",
                elementId: "timeSliderDiv",
                expandIcon: "timer",
                tooltip: "Regulador de tiempo",
                autoExpand: false
            },
            {
                position: "bottom-right",
                content: conteoDiv,
                expandIcon: "graph-bar",
                tooltip: "Estadísticas",
                autoExpand: true
            }
        ];

        widgets.forEach(({ content, elementId, expandIcon, tooltip, autoExpand, position }) => {
            const element = content || document.getElementById(elementId);
            if (!element) { console.warn(`Element not found: ${elementId}`); return; }
            view.ui.add(new Expand({
                view,
                content: element,
                expandIcon,
                expandTooltip: tooltip,
                expanded: autoExpand ?? true
            }), position);
        });

        view.ui.add(new Fullscreen({ view }), "top-right");

        [...recursos, ...incidentes].forEach(({ visible, iconElement }) => {
            if (visible) iconElement.classList.add('active');
            iconElement.style.display = 'block';
        });
    };
});