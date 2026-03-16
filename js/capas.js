// js/capas.js
define([
    "esri/layers/GeoJSONLayer",
    "esri/symbols/SimpleFillSymbol"
], function (GeoJSONLayer, SimpleFillSymbol) {

    function createIncidenteLayer(url, title) {
        return new GeoJSONLayer({
            url: url,
            title: title,
            renderer: {
                type: "heatmap",
                colorStops: [
                    { ratio: 0, color: "rgba(0, 0, 255, 0)" },
                    { ratio: 0.2, color: "rgba(0, 102, 204, 0.7)" },
                    { ratio: 0.4, color: "rgba(51, 204, 255, 0.7)" },
                    { ratio: 0.6, color: "rgba(255, 204, 0, 0.8)" },
                    { ratio: 0.8, color: "rgba(255, 102, 0, 0.9)" },
                    { ratio: 1, color: "rgba(204, 0, 0, 0.9)" }
                ],
                maxDensity: 0.01,
                minDensity: 0,
                /* referenceScale: 66111,  */
                radius: 12
            },

            timeInfo: {
                startField: "Fecha",
                endField: null
            },
            popupTemplate: {
                title: "{Tipo}",
                content: [{
                    type: "fields",
                    fieldInfos: [
                        { fieldName: "Tipo", label: "Tipo" },
                        { fieldName: "Subtipo", label: "Subtipo" },
                        { fieldName: "Circuito", label: "Circuito" },
                        { fieldName: "SubCircuit", label: "Subcircuito" },
                        {
                            fieldName: "Fecha",
                            label: "Fecha",
                            format: {
                                dateFormat: "short-date"
                            }
                        },
                        { fieldName: "Hora", label: "Hora" }
                    ]
                }]
            }
        });
    }

    const rutaColors = {
        "Modelo": [255, 255, 51, 0.9],   // amarillo
        "Sur": [255, 100, 100, 0.9],   // rojo suave
        "Portete": [51, 204, 255, 0.9],   // celeste
        "Pascuales": [100, 255, 150, 0.9],   // verde
        "Nueva Prosperina": [255, 150, 51, 0.9],   // naranja
        "Florida": [200, 100, 255, 0.9],   // morado
        "Esteros": [51, 255, 200, 0.9],   // turquesa
        "Ceibos": [255, 200, 51, 0.9],   // dorado
        "9 de Octubre": [255, 51, 150, 0.9],   // rosa
    };

    function createRutasLayer(url, title) {
        return new GeoJSONLayer({
            url: url,
            title: title,
            renderer: {
                type: "simple",
                symbol: {
                    type: "simple-line",
                    color: rutaColors[title] || [255, 255, 255, 0.8],
                    width: 4,
                    style: "solid"
                }
            }
        });
    }


    function createSubCircuitosLayer(url) {
        return new GeoJSONLayer({
            url: url,
            title: "Sub Circuitos Policia",
            visible: true,
            outFields: ["*"],
            renderer: {
                type: "simple",
                symbol: new SimpleFillSymbol({
                    color: [226, 255, 224, 0.1],
                    outline: { color: "white", width: 1.5 }
                })
            },
            labelingInfo: [{
                labelExpressionInfo: { expression: '$feature.Subcircuit' },
                symbol: {
                    type: "text",
                    color: "blue",
                    haloColor: "white",
                    haloSize: "2px",
                    font: {
                        size: 11,
                        family: "sans-serif",
                        weight: "bold"
                    }
                },
                placement: "center-center"
            }]
        });
    }

    function createZonasLayer(url) {
        // Define un conjunto de colores únicos para cada distrito
        const distritoColors = {
            "PASCUALES": [255, 99, 71, 0.2],           // Tomate suave (Rojo)
            "9 DE OCTUBRE": [255, 165, 0, 0.2],        // Naranja suave
            "PROGRESO": [186, 85, 211, 0.2],           // Púrpura suave
            "MODELO": [144, 238, 144, 0.2],            // Verde claro
            "CEIBOS": [255, 255, 102, 0.2],            // Amarillo pastel
            "PORTETE": [253, 253, 150, 0.2],           // Amarillo pastel suave
            "FLORIDA": [255, 182, 193, 0.2],           // Rosa claro
            "NUEVA PROSPERINA": [100, 149, 237, 0.2],  // Azul suave (Cornflower Blue)
            "ESTEROS": [173, 216, 230, 0.2],           // Azul claro
            "SUR": [255, 228, 181, 0.2]                // Crema suave
        };

        return new GeoJSONLayer({
            url: url,
            renderer: {
                type: "unique-value",
                field: "Distrito",
                uniqueValueInfos: Object.keys(distritoColors).map(distrito => ({
                    value: distrito,
                    symbol: new SimpleFillSymbol({
                        color: distritoColors[distrito],
                        outline: { color: "black", width: 1 }
                    }),
                    label: distrito
                }))
            },
            labelingInfo: [{
                labelExpressionInfo: { expression: '"DISTRITO: " + $feature.Distrito' },
                symbol: {
                    type: "text",
                    color: "blue",
                    haloColor: "white",
                    haloSize: "2px",
                    font: {
                        size: 8,
                        family: "sans-serif",
                        weight: "bold"
                    }
                },
                placement: "center"
            }]
        });
    }

    function createCamaraLayer(url, title, color) {
        return new GeoJSONLayer({
            url: url,
            title: title,
            renderer: {
                type: "simple",
                symbol: {
                    type: "simple-marker",
                    style: "circle",
                    color: color,
                    size: 8,
                    outline: { color: [255, 255, 255, 0.6], width: 1 }
                }
            },
            featureReduction: {
                type: "cluster",
                clusterRadius: "50px",
                clusterMinSize: "24px",
                clusterMaxSize: "40px",
                // Al hacer click en el cluster, hace zoom y los puntos se separan
                popupEnabled: true,
                popupTemplate: {
                    title: "Grupo de {cluster_count} cámaras",
                    content: "Haz zoom para ver las cámaras individuales."
                },
                symbol: {
                    type: "simple-marker",
                    style: "circle",
                    color: [...color.slice(0, 3), 0.6],  // mismo color con más transparencia
                    size: "28px",
                    outline: { color: "white", width: 1.5 }
                },
                labelingInfo: [{
                    deconflictionStrategy: "none",
                    labelExpressionInfo: { expression: "Text($feature.cluster_count, '#,###')" },
                    symbol: {
                        type: "text",
                        color: "white",
                        font: { size: 11, weight: "bold" }
                    },
                    labelPlacement: "center-center"
                }]
            },
            popupTemplate: {
                title: title,
                content: [{
                    type: "fields", fieldInfos: [
                        { fieldName: "HOST", label: "Host" },
                        { fieldName: "NOMBRE_SITIO", label: "Nombre Sitio" },
                        { fieldName: "UBICACIÓN", label: "Ubicación" },
                        { fieldName: "MEGAFONO", label: "Megáfono" },
                        { fieldName: "TIPO", label: "Tipo" },
                        { fieldName: "STATUS", label: "Estado" }
                    ]
                }]
            }
        });
    }

    function crearCapas() {
        return {
            robosLayer: createIncidenteLayer("geojson/robos.geojson", "Robos"),
            convivenciaLayer: createIncidenteLayer("geojson/convivencia.geojson", "Convivencia"),
            extorsionLayer: createIncidenteLayer("geojson/extorsion.geojson", "Extorsión"),
            p_armadaLayer: createIncidenteLayer("geojson/p_armada.geojson", "Persona Armada"),
            p_heridaLayer: createIncidenteLayer("geojson/p_herida.geojson", "Persona Herida"),
            secuestroLayer: createIncidenteLayer("geojson/secuestro.geojson", "Secuestro"),
            sustanciasLayer: createIncidenteLayer("geojson/sustancias.geojson", "Sustancias"),
            sicariatoLayer: createIncidenteLayer("geojson/sicariato.geojson", "Muertes Violentas"),

            rutaModeloLayer: createRutasLayer("geojson/MODELO.geojson", "Modelo"),
            rutaSurLayer: createRutasLayer("geojson/SUR.geojson", "Sur"),
            rutaPorteteLayer: createRutasLayer("geojson/PORTETE.geojson", "Portete"),
            rutaPascualesLayer: createRutasLayer("geojson/PASCUALES.geojson", "Pascuales"),
            rutaNuevaProsperinaLayer: createRutasLayer("geojson/NUEVA_PROSPERINA.geojson", "Nueva Prosperina"),
            rutaFloridaLayer: createRutasLayer("geojson/FLORIDA.geojson", "Florida"),
            rutaEsterosLayer: createRutasLayer("geojson/ESTEROS.geojson", "Esteros"),
            rutaCeibosLayer: createRutasLayer("geojson/CEIBOS.geojson", "Ceibos"),
            ruta9OctLayer: createRutasLayer("geojson/9_OCT.geojson", "9 de Octubre"),
            subCircuitosLayer: createSubCircuitosLayer("geojson/subcircuitos.geojson"),
            distritosLayer: createZonasLayer("geojson/distritos.geojson"),
            
            camarasActivasLayer: createCamaraLayer("geojson/camaras_activas.geojson", "Cámaras Activas", [0, 220, 120, 0.95]),
            camarasVandalizadasLayer: createCamaraLayer("geojson/camaras_vandalizadas.geojson", "Cámaras Vandalizadas", [255, 80, 80, 0.95]),
            camarasSeguraALayer: createCamaraLayer("geojson/camaras_segura_a.geojson", "Cámaras Segura EP Activas", [0, 180, 255, 0.95]),
            camarasSeguraILayer: createCamaraLayer("geojson/camaras_segura_i.geojson", "Cámaras Segura EP Inactivas", [150, 100, 200, 0.95])
        };
    }

    console.log("Módulo capas.js cargado")
    return { crearCapas };
});
