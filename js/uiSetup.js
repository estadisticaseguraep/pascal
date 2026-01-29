define([
    "esri/widgets/Expand"
], function (Expand) {

    return function setupUI(view, opciones) {
        const {
            recursos,
            incidentes,
            conteoDiv
        } = opciones;

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
                autoExpand: true
            },
            {
                position: "bottom-right",
                content: conteoDiv,
                expandIcon: "graph-bar",
                tooltip: "Estadísticas",
                autoExpand: true
            }
        ];

        widgets.forEach(config => {
            const content = config.content || document.getElementById(config.elementId);

            if (!content) {
                console.warn(`Element not found: ${config.elementId}`);
                return;
            }

            const expandConfig = {
                view: view,
                content: content,
                expandIcon: config.expandIcon,
                expandTooltip: config.tooltip,
                expanded: config.autoExpand !== undefined ? config.autoExpand : true
            };

            view.ui.add(new Expand(expandConfig), config.position);
        });

        // Mostrar íconos activos y agregarlos al contenedor
        recursos.forEach(layerObject => {
            if (layerObject.visible) layerObject.iconElement.classList.add('active');
            layerObject.iconElement.style.display = 'block';
        });

        incidentes.forEach(layerObject => {
            if (layerObject.visible) layerObject.iconElement.classList.add('active');
            layerObject.iconElement.style.display = 'block';
        });


    };
});
