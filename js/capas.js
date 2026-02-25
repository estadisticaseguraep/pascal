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
                    width: 2,
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
            subCircuitosLayer: createSubCircuitosLayer("geojson/subcircuitos.geojson")
        };
    }

    console.log("Módulo capas.js cargado")
    return { crearCapas };
});
