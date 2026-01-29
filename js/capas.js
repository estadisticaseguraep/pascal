// js/capas.js
define([
    "esri/layers/GeoJSONLayer"
], function (GeoJSONLayer) {

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

    function crearCapas() {
        return {
            robosLayer: createIncidenteLayer("geojson/robos.geojson", "Robos"),
            convivenciaLayer: createIncidenteLayer("geojson/convivencia.geojson", "Convivencia"),
            extorsionLayer: createIncidenteLayer("geojson/extorsion.geojson", "Extorsión"),
            p_armadaLayer: createIncidenteLayer("geojson/p_armada.geojson", "Persona Armada"),
            p_heridaLayer: createIncidenteLayer("geojson/p_herida.geojson", "Persona Herida"),
            secuestroLayer: createIncidenteLayer("geojson/secuestro.geojson", "Secuestro"),
            sustanciasLayer: createIncidenteLayer("geojson/sustancias.geojson", "Sustancias"),
            sicariatoLayer: createIncidenteLayer("geojson/sicariato.geojson", "Muertes Violentas")
        };
    }

    console.log("Módulo capas.js cargado")
    return { crearCapas };
});
