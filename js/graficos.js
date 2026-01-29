define([
    "esri/Graphic",
    "esri/geometry/Polyline",
    "esri/geometry/geometryEngineAsync"
], function (Graphic, Polyline, geometryEngineAsync) {

    function getMonthKey(timestamp) {
        const iso = new Date(timestamp).toISOString();
        const [year, month] = iso.split("T")[0].split("-");
        return `${year}-${month}`;
    }

    async function consultarPorMes(layer, easValues = [], timeExtent = null, geometry = null) {
        const query = layer.createQuery();
        query.where = easValues.length > 0 && !easValues.includes("")
            ? `Code IN (${easValues.map(code => `'${code}'`).join(",")})`
            : "1=1";
        query.outFields = ["Fecha"];
        query.returnGeometry = false;

        if (timeExtent) query.timeExtent = timeExtent;
        if (geometry) query.geometry = geometry;

        const results = await layer.queryFeatures(query);
        const conteoMes = {};

        results.features.forEach(feature => {
            const fecha = feature.attributes.Fecha;
            if (fecha) {
                const mes = getMonthKey(fecha);
                conteoMes[mes] = (conteoMes[mes] || 0) + 1;
            }
        });

        return conteoMes;
    }

    let chartInstance = null;

    async function generarGraficoLineas(capas, easValues = [], timeExtent = null, bufferGeometry = null) {
        const todosResultados = await Promise.all(
            capas.map(c => consultarPorMes(c.layer, easValues, timeExtent, bufferGeometry))
        );

        const meses = new Set();
        todosResultados.forEach(conteo => {
            Object.keys(conteo).forEach(mes => meses.add(mes));
        });

        const mesesOrdenados = Array.from(meses).sort();

        const datasets = todosResultados.map((conteo, index) => {
            const data = mesesOrdenados.map(mes => conteo[mes] || 0);
            return {
                label: capas[index].label,
                data,
                borderColor: capas[index].color,
                fill: false,
                tension: 0.3
            };
        });

        if (chartInstance) {
            chartInstance.destroy();
        }

        const ctx = document.getElementById('incidentesChart').getContext('2d');

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: mesesOrdenados,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Incidentes por Mes',
                        color: '#ffffff'
                    },
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: true
                },
                scales: {
                    x: {
                        ticks: { color: '#ffffff' },
                        title: {
                            display: true,
                            text: 'Mes',
                            color: '#ffffff'
                        }
                    },
                    y: {
                        ticks: { color: '#ffffff' },
                        title: {
                            display: true,
                            text: 'Cantidad',
                            color: '#ffffff'
                        },
                        beginAtZero: true
                    }
                }
            },
            plugins: [{
                id: 'customCanvasBackgroundColor',
                beforeDraw: (chart) => {
                    const ctx = chart.canvas.getContext('2d');
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = '#414d55';
                    ctx.fillRect(0, 0, chart.width, chart.height);
                    ctx.restore();
                }
            }]
        });
    }

    function getDayOfWeek(fecha) {
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        return dias[new Date(fecha).getDay()];
    }

    async function consultarPorDiaHora(layer, easValues = [], timeExtent = null, geometry = null) {
        const query = layer.createQuery();
        query.where = easValues.length > 0 && !easValues.includes("")
            ? `Code IN (${easValues.map(code => `'${code}'`).join(",")})`
            : "1=1";
        query.outFields = ["Fecha", "Hora", "StatusInci"];
        query.returnGeometry = false;

        if (timeExtent) query.timeExtent = timeExtent;
        if (geometry) query.geometry = geometry;
        const results = await layer.queryFeatures(query);

        const conteo = {}; // conteo[day][hour] = suma

        results.features.forEach(feature => {
            const { Fecha, Hora, StatusInci } = feature.attributes;

            if (!Fecha || Hora == null) return;

            const dia = getDayOfWeek(Fecha);
            const hora = parseInt(Hora);
            const suma = parseFloat(StatusInci) || 1;

            if (!conteo[dia]) conteo[dia] = {};
            conteo[dia][hora] = (conteo[dia][hora] || 0) + suma;
        });

        return conteo;
    }

    let heatmapInstance = null;
    async function generarHeatmap(capas, easValues = [], timeExtent = null, bufferGeometry = null) {
        const resultados = await Promise.all(
            capas.map(c => consultarPorDiaHora(c.layer, easValues, timeExtent, bufferGeometry))
        );

        const diasOrden = ['Domingo', 'Sábado', 'Viernes', 'Jueves', 'Miércoles', 'Martes', 'Lunes'];
        const horas = Array.from({ length: 24 }, (_, i) => i);

        const conteoTotal = {};
        resultados.forEach(conteo => {
            diasOrden.forEach(dia => {
                if (!conteoTotal[dia]) conteoTotal[dia] = {};
                horas.forEach(hora => {
                    conteoTotal[dia][hora] = (conteoTotal[dia][hora] || 0) + (conteo[dia]?.[hora] || 0);
                });
            });
        });

        const matrixData = [];
        diasOrden.forEach((dia, y) => {
            horas.forEach(hora => {
                const valor = conteoTotal[dia][hora] || 0;
                matrixData.push({
                    x: hora,
                    y: dia,
                    v: valor
                });
            });
        });

        const maxValor = Math.max(...matrixData.map(d => d.v));

        if (heatmapInstance) heatmapInstance.destroy();

        const ctx = document.getElementById('heatmapChart').getContext('2d');

        heatmapInstance = new Chart(ctx, {
            type: 'matrix',
            data: {
                datasets: [{
                    label: 'Incidentes por Día y Hora',
                    data: matrixData,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    backgroundColor(ctx) {
                        const value = ctx.dataset.data[ctx.dataIndex].v;
                        const alpha = maxValor ? value / maxValor : 0;

                        // Gradiente verde (bajo) a rojo (alto)
                        const r = Math.floor(255 * alpha);
                        const g = Math.floor(255 * (1 - alpha));
                        const b = 0;

                        return `rgba(${r},${g},${b},${alpha})`;
                    },
                    width: ({ chart }) => ((chart.chartArea?.width || 0) / 24) - 2,
                    height: ({ chart }) => ((chart.chartArea?.height || 0) / 7) - 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: 0,
                        max: 23,
                        ticks: {
                            stepSize: 1,
                            color: '#ffffff',
                            callback: val => `${val}:00`
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        },
                        title: {
                            display: true,
                            color: '#ffffff'
                        }
                    },
                    y: {
                        type: 'category',
                        labels: diasOrden,
                        offset: true,
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        },
                        title: {
                            display: true,
                            color: '#ffffff'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: ctx => `Día: ${ctx[0].raw.y}`,
                            label: ctx => `Hora: ${ctx.raw.x}:00 - ${ctx.raw.v} incidentes`
                        }
                    },
                    title: {
                        display: true,
                        text: 'Heatmap Día vs Hora',
                        color: '#ffffff',
                        font: {
                            size: 18,
                            weight: 'bold'
                        }
                    },
                    legend: { display: false }
                },
                layout: {
                    padding: 10
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: ctx => `Día: ${ctx[0].raw.y}`,
                            label: ctx => `Hora: ${ctx.raw.x}:00 - ${ctx.raw.v} incidentes`
                        }
                    },
                    title: {
                        display: true,
                        text: 'Mapa de Calor Días - Horas',
                        color: '#ffffff',
                        font: {
                            size: 14,
                            weight: 'normal'
                        }
                    },
                    legend: { display: false }
                }

            }
        });
    }

    async function drawDraggableCircle(view, sketchViewModel, bufferLayer, createPointSymbol, createLineSymbol, createBufferSymbol) {

        const distanceInMeters = 1500;
        const centerPoint = view.center;
        const buffer = await geometryEngineAsync.geodesicBuffer(centerPoint, distanceInMeters, "meters");

        const edgePoint = buffer.rings[0][0];

        const line = new Polyline({
            paths: [[centerPoint.x, centerPoint.y], [edgePoint[0], edgePoint[1]]],
            spatialReference: view.spatialReference
        });

        const centerGraphic = new Graphic({
            geometry: centerPoint,
            symbol: createPointSymbol([0, 255, 255]),
            attributes: { role: "center" }
        });

        const edgeGraphic = new Graphic({
            geometry: {
                type: "point",
                x: edgePoint[0],
                y: edgePoint[1],
                spatialReference: view.spatialReference
            },
            symbol: createPointSymbol([255, 0, 0]),
            attributes: { role: "edge" }
        });

        const polylineGraphic = new Graphic({
            geometry: line,
            symbol: createLineSymbol()
        });

        const bufferGraphic = new Graphic({
            geometry: buffer,
            symbol: createBufferSymbol()
        });

        sketchViewModel.layer.addMany([centerGraphic, edgeGraphic, polylineGraphic]);
        bufferLayer.add(bufferGraphic);
        sketchViewModel.update([centerGraphic, edgeGraphic], { tool: "move" });

        return { centerGraphic, edgeGraphic, polylineGraphic, bufferGraphic };
    }

    async function updateBuffer(centerGraphic, edgeGraphic, bufferGraphic, polylineGraphic, view) {
        const vertices = [
            [centerGraphic.geometry.x, centerGraphic.geometry.y],
            [edgeGraphic.geometry.x, edgeGraphic.geometry.y]
        ];

        const line = new Polyline({
            paths: [vertices],
            spatialReference: view.spatialReference
        });

        const distance = await geometryEngineAsync.geodesicLength(line, "meters");
        const buffer = await geometryEngineAsync.geodesicBuffer(centerGraphic.geometry, distance, "meters");

        bufferGraphic.geometry = buffer;
        polylineGraphic.geometry = line;

        const edgePoint = edgeGraphic.geometry;
        const midX = (centerGraphic.geometry.x + edgeGraphic.geometry.x) / 2;
        const midY = (centerGraphic.geometry.y + edgeGraphic.geometry.y) / 2;

        const labelPoint = {
            type: "point",
            x: edgePoint.x,
            y: edgePoint.y,
            spatialReference: view.spatialReference
        };

        return { distance, midPoint: labelPoint, bufferGeometry: buffer };
    }


    return {
        generarGraficoLineas,
        generarHeatmap,
        drawDraggableCircle,
        updateBuffer,
    };
});
