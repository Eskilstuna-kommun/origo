import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Stroke, Style, Fill } from 'ol/style';
import { getCenter } from 'ol/extent';
import { Translate } from 'ol/interaction';
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import { Polygon } from 'ol/geom';
import { Component } from '../ui';

const Printarea = function Printarea(options = {}) {
  const {
    printAreaColor = 'rgba(123,104,238, 0.4)' // default color
  } = options;

  function createPreviewFeature(scale, paper, center) {
    const dpi = 25.4 / 0.28;
    const ipu = 39.37;
    const sf = 1;
    const w = (paper.width / dpi / ipu) * (scale / 2) * sf;
    const y = (paper.height / dpi / ipu) * (scale / 2) * sf;
    const coords = [
      [
        [center[0] - w, center[1] - y],
        [center[0] - w, center[1] + y],
        [center[0] + w, center[1] + y],
        [center[0] + w, center[1] - y],
        [center[0] - w, center[1] - y]
      ]
    ];
    const feature = new Feature({
      geometry: new Polygon(coords)
    });
    return feature;
  }

  let viewer = options.viewer;
  let map;
  let vector;

  function updatePreviewFeature(scale, paper, center) {
    // vector = getVector();
    const feature = createPreviewFeature(scale, paper, center);
    vector.getSource().clear();
    vector.set('polygonFeature', feature);
    vector.getSource().addFeature(feature);
    const translate = new Translate({
      features: new Collection([feature])
    });
    map.addInteraction(translate);
  }

  return Component({
    onAdd(evt) {
      viewer = evt.target;
    },
    printA1: () => {
      map = viewer.getMap();
      vector = new VectorLayer({
        group: 'none',
        source: new VectorSource({
          features: [],
          name: 'printarea',
          visible: true
        }),
        style: new Style({
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
            width: 2
          }),
          fill: new Fill({
            color: `${printAreaColor}` // retrieves value from index.json, if values do not exist it gets default
          })
        })
      });
      map.addLayer(vector);
      vector.setZIndex(501);

      return vector;
    },
    getVector: () => vector,
    addPreview: (scale, paper) => {
      let center;
      if (vector.getSource().getFeatures().length > 0) {
        const extent = vector.getSource().getFeatures()[0].getGeometry().getExtent();
        center = getCenter(extent);
      } else {
        center = map.getView().getCenter();
      }
      updatePreviewFeature(scale, paper, center);
    },
    onInit() {},
    render() {
      this.dispatch('render');
    }
  });
};

export default Printarea;
