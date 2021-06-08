import { io } from 'socket.io-client';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSONFormat from 'ol/format/GeoJSON';
import { Component } from '../ui';

const Notifications = function Notifications(options = {}) {
  let viewer;

  return Component({
    name: 'notifications',
    onAdd(evt) {
      viewer = evt.target;
      let vectorLayer;
      const map = viewer.getMap();
      const socket = io('http://localhost:3001');
      socket.on('connect', () => {
        console.log('connected');
      });
      socket.on('DRAW-GEOMETRY', (value) => {
        console.log(value);
        console.log('draw geometry event');
        const format = new GeoJSONFormat({ featureProjection: 'EPSG:3857' });
        const vectorSource = new VectorSource({
          features: format.readFeatures(value[0].location)
        });
        if (!vectorLayer) {
          vectorLayer = new VectorLayer({
            source: vectorSource,
            name: 'sooth',
            group: 'root',
            title: 'truth',
            queryable: true
          });

          map.addLayer(vectorLayer);
        } else {
          vectorLayer.setSource(vectorSource);
        }
        map.getView().fit(vectorSource.getExtent());
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
