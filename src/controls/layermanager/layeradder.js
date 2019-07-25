//import 'Origo';
import { Component, Element as El, Button, dom } from '../../ui';
import readAsync from './readasync';

const LayerAdder = function LayerAdder(options = {}) {
  const {
    layerId,
    cls: clsSettings = 'round compact boxshadow-subtle text-inverse icon-small',
    addIcon = '#cu_add_24px',
    removeIcon = '#cu_remove_24px',
    sourceUrl,
    type = 'layer',
    title,
    src,
    viewer
  } = options;

  const layer = viewer.getLayer(layerId);
  const group = viewer.getGroup(layerId);
  const initialState = layer || group ? 'remove' : 'initial';
  const initialIcon = initialState === 'initial' ? addIcon : removeIcon;
  const initialBgCls = initialState === 'initial' ? 'primary' : 'danger';
  const cls = `${clsSettings} layeradder ${initialBgCls}`.trim();

  const fetchLayer = async function fetchLayer() {
    const body = JSON.stringify([{
      id: layerId,
      type
    }]);
    try {
      const result = await fetch(sourceUrl, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        method: 'POST',
        mode: 'cors',
        body
      }).then(response => response.json());
      return result;
    }
    catch (err) {
      console.log(err);
    }
  };

  const addSources = function addSources(sources) {
    Object.keys(sources).forEach((sourceName) => {
      viewer.addSource(sourceName, sources[sourceName]);
    });
  };

  const addStyles = function addStyles(styles) {
    Object.keys(styles).forEach((styleName) => {
      viewer.addStyle(styleName, styles[styleName]);
    });
  };  

  const initial = function initial() {
    this.setIcon(addIcon);
    const el = document.getElementById(this.getId());
    el.classList.remove('danger');
    el.classList.add('primary');    
  };

  const remove = function remove() {
    this.setIcon(removeIcon);
    const el = document.getElementById(this.getId());
    el.classList.remove('primary');
    el.classList.add('danger');
  };

  const click = async function click() {
    if (this.getState() === 'remove') {
      const layer = viewer.getLayer(layerId);
      if (layer) {
        viewer.getMap().removeLayer(layer);
        this.setState('initial');
        return 'intial';
      }
      const group = viewer.getGroup(layerId);
      if (group) {
        viewer.removeGroup(layerId);
        this.setState('initial');
        return 'initial';
      }
    } else if (this.getState() === 'initial') {
      this.setState('loading');
      //const { error, data: layerConfig} = await readAsync(fetchLayer());
      //if (error || layerConfig.error) {
        //const errorMsg = error || layerConfig.error;
        //console.log(errorMsg);
     // } else if (layerConfig.layers.length) {
        let srcUrl = src
        if (src[src.length-1] == '?') srcUrl = src.substring(0,src.length-1)
        let layers = [{
            name: layerId,
            title: title,
            group: "mylayers",
            queryable: true,
            type: "WMS",
            visible: true,
            source: srcUrl,
            infoFormat: "text/html",
            useLegendGraphics: true,
            removable: true,
            legendGraphicSettings: {
                transparent: true,
                service: "WMS"
            }
        }]
        //const layers = layerConfig.layers;
        //viewer.addGroups(layerConfig.groups);
        let srcObject = {}
        srcObject[`${srcUrl}`] = {url : srcUrl}
        addSources(srcObject);
        //addStyles(layerConfig.style);
        viewer.addLayers(layers);
        this.setState('remove');
      // } else {
      //   console.log('Layer could not be added to map.');
      //   this.setState('initial');
      // }
    }
  };

  return Button({
    click,
    cls,
    icon: initialIcon,
    iconStyle: {
      fill: '#fff'
    },
    validStates: ['initial', 'remove'],
    methods: {
      initial,
      remove
    },
    state: initialState
  });
}

export default LayerAdder;