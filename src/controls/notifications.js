import { io } from 'socket.io-client';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Circle, Stroke, Style } from 'ol/style';
import GeoJSONFormat from 'ol/format/GeoJSON';
import { Component } from '../ui';

const Notifications = function Notifications(options = {}) {
  let viewer;
  const geoJsonStyle = new Style({
    image: new Circle({
      fill: null,
      stroke: new Stroke({ color: 'blue', width: 3 }),
      radius: 13
    }),
    fill: null,
    stroke: new Stroke({ color: 'blue', width: 3 })
  });
  return Component({
    name: 'notifications',
    onAdd(evt) {
      viewer = evt.target;
      let vectorLayer;
      const map = viewer.getMap();
      const socket = io(options.webSocketEndpoint);

      // Listen to a redraw event from server and trigger a refresh of
      // relevant WFS-layer
      socket.on('redraw-layer', (layerToReload) => {
        const layers = map.getLayers();
        layers.forEach(layer => {
          const layerProperties = layer.getProperties();
          if (layerProperties.sourceName === layerToReload.sourceName && layerProperties.name === layerToReload.name) {
            layer.getSource().refresh();
          }
        });
      });

      // Listen to draw-geometry event from server and add geometry to the map
      // Work in progress
      socket.on('draw-geometry', (data) => {
        const format = new GeoJSONFormat({ featureProjection: viewer.getProjectionCode() });
        const vectorSource = new VectorSource({
          features: format.readFeatures(data.geoJson)
        });
        if (vectorLayer) {
          vectorLayer.setSource(vectorSource);
        } else {
          vectorLayer = new VectorLayer({
            source: vectorSource,
            group: 'root',
            title: data.layerTitle,
            style: geoJsonStyle,
            queryable: true
          });

          map.addLayer(vectorLayer);
        }
      });

      this.render();
    },
    onInit() {
    },
    render() {
      this.dispatch('render');
    }
  });
};

export default Notifications;
