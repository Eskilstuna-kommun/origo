import 'owl.carousel';
import Overlay from 'ol/Overlay';
import $ from 'jquery';
import { Component } from './ui';
import Popup from './popup';
import sidebar from './sidebar';
import maputils from './maputils';
import featurelayer from './featurelayer';
import Style from './style';
import StyleTypes from './style/styletypes';
import getFeatureInfo from './EK_getfeatureinfo';
import replacer from '../src/utils/replacer';

const styleTypes = StyleTypes();

const Featureinfo = function Featureinfo(options = {}) {
  const {
    clickEvent = 'click',
    clusterFeatureinfoLevel = 1,
    hitTolerance = 0,
    pinsStyle: pinStyleOptions = styleTypes.getStyle('pin'),
    savedPin: savedPinOptions,
    savedSelection,
    selectionStyles: selectionStylesOptions,
    showOverlay = true
  } = options;

  let {
    pinning = true
  } = options;

  let identifyTarget;
  let overlay;
  let items;
  let popup;
  let selectionLayer;
  let viewer;

  const pinStyle = Style.createStyleRule(pinStyleOptions)[0];
  const selectionStyles = selectionStylesOptions ? Style.createGeometryStyle(selectionStylesOptions) : Style.createEditStyle();
  let savedPin = savedPinOptions ? maputils.createPointFeature(savedPinOptions, pinStyle) : undefined;
  const savedFeature = savedPin || savedSelection || undefined;

  if (showOverlay) {
    identifyTarget = 'overlay';
  } else {
    sidebar.init();
    identifyTarget = 'sidebar';
  }

  const clear = function clear() {
    selectionLayer.clear();
    sidebar.setVisibility(false);
    if (overlay) {
      viewer.removeOverlays(overlay);
    }
  };

  const callback = function callback(evt) {
    const currentItem = evt.item.index;
    if (currentItem !== null) {
      /*If current is a FTL, it does not have the feature prop*/
      if(!items[currentItem].feature) {
        popup.setTitle(items[currentItem].title);
      }
      else {
        const clone = items[currentItem].feature.clone();
        clone.setId(items[currentItem].feature.getId());
        selectionLayer.clearAndAdd(
          clone,
          selectionStyles[items[currentItem].feature.getGeometry().getType()]
        );
        let featureinfoTitle;
        let title;
        let layer;
        if (items[currentItem].layer) {
          if (typeof items[currentItem].layer === 'string') {
            layer = viewer.getLayer(items[currentItem].layer);
          } else {
            layer = viewer.getLayer(items[currentItem].layer.get('name'));
          }
        }
        if (layer) {
          featureinfoTitle = layer.getProperties().featureinfoTitle;
        }

        if (featureinfoTitle) {
          const featureProps = items[currentItem].feature.getProperties();
          title = replacer.replace(featureinfoTitle, featureProps);
          if (!title) {
            title = items[currentItem].title ? items[currentItem].title : items[currentItem].name;
          }
        } else {
          title = items[currentItem].title ? items[currentItem].title : items[currentItem].name;
        }
        selectionLayer.setSourceLayer(items[currentItem].layer);
        if (identifyTarget === 'overlay') {
          popup.setTitle(title);
        } else {
          sidebar.setTitle(title);
        }    
      }
    }
  };

  const initCarousel = function initCarousel(id, opt) {
    const carouselOptions = opt || {
      onChanged: callback,
      items: 1,
      nav: true,
      navText: ['<svg class="o-icon-fa-chevron-left"><use xlink:href="#fa-chevron-left"></use></svg>',
        '<svg class="o-icon-fa-chevron-right"><use xlink:href="#fa-chevron-right"></use></svg>'
      ]
    };
    if (identifyTarget === 'overlay') {
      const popupHeight = $('.o-popup').outerHeight() + 20;
      $('#o-popup').height(popupHeight);
    }

    return $(id).owlCarousel(carouselOptions);
  };

  function getSelectionLayer() {
    return selectionLayer.getFeatureLayer();
  }

  function getSelection() {
    const selection = {};
    const firstFeature = selectionLayer.getFeatures()[0];
    if (firstFeature) {
      selection.geometryType = firstFeature.getGeometry().getType();
      selection.coordinates = firstFeature.getGeometry().getCoordinates();
      selection.id = firstFeature.getId() != null ? firstFeature.getId() : firstFeature.ol_uid;
      selection.type = typeof selectionLayer.getSourceLayer() === 'string' ? selectionLayer.getFeatureLayer().type : selectionLayer.getSourceLayer().get('type');
      if (selection.type === 'GEOJSON' || selection.type === 'AGS_FEATURE') {
        const name = typeof selectionLayer.getSourceLayer() === 'string' ? selectionLayer.getSourceLayer() : selectionLayer.getSourceLayer().get('name');
        const id = firstFeature.getId() || selection.id;
        selection.id = `${name}.${id}`;
      }
    }
    return selection;
  }

  const getPin = function getPin() {
    return savedPin;
  };

  const getHitTolerance = function getHitTolerance() {
    return hitTolerance;
  };

  const render = function render(identifyItems, target, coordinate) {
    const map = viewer.getMap();
    items = identifyItems;
    clear();
    let content = items.map(i => i.content).join('');
    content = `<div id="o-identify"><div id="o-identify-carousel" class="owl-carousel owl-theme">${content}</div></div>`;
    switch (target) {
      case 'overlay':
      {
        popup = Popup(`#${viewer.getId()}`);
        //Experimental workaround for the default ESRI getFeatureInfo text/html templates returned by LST ArcGIS WMS services
        //Gets rid of the <h5 large non-enlightening 'featureCollection: layer name '4''
        //and linkifies any url in the table 
        const agsNameReplace = /<h5>FeatureInfoCollection - layer name: '[-A-Z0-9+&@#/%?=~_|!:,.;]*'<\/h5>/gim;
        content = content.replace(agsNameReplace, '');
        const urlifyReplace = /<td>(\b(https?|ftp):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gim;
        content = content.replace(urlifyReplace, '<td><a href="$1" target="_blank">$1</a>');
        const tableTextSizeReplace = /font-size: 80%;/;
        content = content.replace(tableTextSizeReplace, 'font-size: 85%;');

        popup.setContent({
          content,
          title: items[0].title
        });
        popup.setVisibility(true);
        initCarousel('#o-identify-carousel');
        const popupHeight = $('.o-popup').outerHeight() + 20;
        $('#o-popup').height(popupHeight);
        
        //Force popup to not cover origo controls
        popup.getEl().children[0].style.zIndex = "24";
        
        overlay = new Overlay({
          element: popup.getEl(),
          autoPan: true,
          autoPanAnimation: {
            duration: 500
          },
          autoPanMargin: 40,
          positioning: 'bottom-center'
        });

        /*Modified for FTL*/
        if(items[0].feature){
          coordinate = items[0].feature.getGeometry().getType() == 'Point' ? items[0].feature.getGeometry().getCoordinates() : coordinate;
        }
        //const geometry = items[0].feature.getGeometry();
        //const coord = geometry.getType() === 'Point' ? geometry.getCoordinates() : coordinate;

        map.addOverlay(overlay);
        overlay.setPosition(coordinate);
        break;
      }
      case 'sidebar':
      {
        sidebar.setContent({
          content,
          title: items[0].title
        });
        sidebar.setVisibility(true);
        initCarousel('#o-identify-carousel');
        break;
      }
      default:
      {
        break;
      }
    }
  };

  const onClick = function onClick(evt) {
    savedPin = undefined;
    // Featurinfo in two steps. Concat serverside and clientside when serverside is finished
    const pixel = evt.pixel;
    const map = viewer.getMap();
    const coordinate = evt.coordinate;
    const layers = viewer.getQueryableLayers();
    const clientResult = getFeatureInfo.getFeaturesAtPixel({
      coordinate,
      clusterFeatureinfoLevel,
      hitTolerance,
      map,
      pixel
    }, viewer);
    // Abort if clientResult is false
    if (clientResult !== false) {
      getFeatureInfo.getFeaturesFromRemote({
        coordinate,
        layers,
        map,
        pixel
      }, viewer)
        .done((data) => {
          const serverResult = data || [];
          const result = serverResult.concat(clientResult);
          if (result.length > 0) {
            selectionLayer.clear();
            render(result, identifyTarget, evt.coordinate);
          } else if (selectionLayer.getFeatures().length > 0) {
            clear();
          } else if (pinning) {
            const resolution = map.getView().getResolution();
            sidebar.setVisibility(false);
            setTimeout(() => {
              if (!maputils.checkZoomChange(resolution, map.getView().getResolution())) {
                savedPin = maputils.createPointFeature(evt.coordinate, pinStyle);
                selectionLayer.addFeature(savedPin);
              }
            }, 250);
          }
        });
    }
  };

  const setActive = function setActive(state) {
    const map = viewer.getMap();
    if (state) {
      map.on(clickEvent, onClick);
    } else {
      clear();
      map.un(clickEvent, onClick);
    }
  };

  return Component({
    name: 'featureInfo',
    clear,
    getHitTolerance,
    getPin,
    getSelectionLayer,
    getSelection,
    setPinning(newState){
      pinning = newState;
    },
    onAdd(e) {
      viewer = e.target;
      const map = viewer.getMap();
      selectionLayer = featurelayer(savedFeature, map);
      map.on(clickEvent, onClick);
      viewer.on('toggleClickInteraction', (detail) => {
        if ((detail.name === 'featureinfo' && detail.active) || (detail.name !== 'featureinfo' && !detail.active)) {
          setActive(true);
        } else {
          setActive(false);
        }
      });
    },
    render
  });
};

export default Featureinfo;
