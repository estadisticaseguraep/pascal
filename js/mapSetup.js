define([
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/TimeSlider",
    "esri/layers/VectorTileLayer"
], function (Map, MapView, TimeSlider, VectorTileLayer) {

    function crearMapaBase() {
        return new Map({
            basemap: {
                baseLayers: [
                    new VectorTileLayer({
                        portalItem: {
                            id: "d7397603e9274052808839b70812be50"       // Human Geography Dark Base
                        }
                    }),
                    new VectorTileLayer({
                        portalItem: {
                            id: "1ddbb25aa29c4811aaadd94de469856a"       // Human Geography Dark Detail (reference)
                        },
                        opacity: 0.5
                    }),
                    new VectorTileLayer({
                        portalItem: {
                            id: "4a3922d6d15f405d8c2b7a448a7fbad2"       // Human Geography Dark Labels (reference)
                        }
                    })
                ],
                title: "Human Geography Dark"
            }
        });
    }

    function crearMapView(map) {
        return new MapView({
            container: "viewDiv",
            map: map,
            zoom: 13,
            center: [-79.8772394, -2.1843859],
            /* rotation: 65,  */
            ui: {
                components: ["attribution"]
            }
        });
    }

    // En js/mapSetup.js
    function crearTimeSlider(view) {
        return new TimeSlider({
            container: "timeSliderDiv",
            view: view,
            fullTimeExtent: {
                start: new Date(2025, 0, 1),
                end: new Date(2025, 11, 31)
            },
            timeExtent: {
                start: new Date(2025, 9, 1), 
                end: new Date(2025, 11, 31)
            },
            playRate: 1000,
            stops: {
                interval: {
                    value: 1,
                    unit: "days"
                }
            }
        });
    }

    return {
        crearMapaBase,
        crearMapView,
        crearTimeSlider
    };
});
