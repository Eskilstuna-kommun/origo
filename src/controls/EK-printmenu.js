import { getCenter } from 'ol/extent';
import { Component, Button, dom, Element } from '../ui';
import Mapfishprint from './EK-mapfishprint';
import maputils from '../maputils';
import Printarea from './EK-printarea';

const Printmenu = function Printmenu(options = {}) {
  let viewer;
  const {
    largeScaleRestriction,
    orientations,
    employsArcGISServerWMS,
    MapfishInfoUrl,
    MapfishCreateUrl,
    layerErrorMessage,
    otherErrorMessage,
    printAreaColor
  } = options;

  let mapfishConfig;
  let hideLayouts;
  let layoutIfHidden;
  let vector;
  let existingLayoutNames;

  // components internally
  let closePrintMenu;
  let printButtonTool;
  let sizeselect;
  let scaleselect;
  let orientationselect;
  let clearButton;
  let layoutselect;
  let printDpi;
  let printCreate;
  let formatselect;
  let titleInput;

  // imported "help-components" specific for this printmenu
  let printarea;
  let mapfishPrint;

  // Html objects of some components
  let htmlSizes;
  let htmlOrientation;
  let htmlLayouts;
  let htmlScales;
  let htmlResos;
  let htmlPrintmenu;
  let htmlTitle;

  function buildLayoutObjectsArray() {
    let layoutObjectsArray = [];
    if (hideLayouts) {
      layoutObjectsArray = [layoutIfHidden, htmlSizes.options[htmlSizes.selectedIndex].text, htmlOrientation.value];
    } else {
      layoutObjectsArray = [htmlLayouts.value, htmlSizes.options[htmlSizes.selectedIndex].text, htmlOrientation.value];
    }
    if (htmlTitle.value !== '') {
      layoutObjectsArray.push('Title');
    }
    if (document.getElementById('o-legend-input').checked) {
      layoutObjectsArray.push('Legend');
    }
    return layoutObjectsArray;
  }

  // Three to five arguments expected
  // Title and Legend are optional, layoutName and paperSize and orientation are not
  function buildLayoutString(...str) {
    if (str.length === 3) {
      return `${str[0]}-${str[1]}-${str[2]}`;
    } else if (str.length === 4) {
      return `${str[0]}-${str[1]}-${str[2]}-${str[3]}`;
    } else if (str.length === 5) {
      return `${str[0]}-${str[1]}-${str[2]}-${str[3]}-${str[4]}`;
    }
    return console.log(buildLayoutString);
  }

  function getPaperMeasures() {
    let width = 0;
    let height = 0;

    // Sätt storlek på polygon till storlek på kartutsnitt
    // Hämta vald mall
    // let size = sizeselect.options[sizeselect.selectedIndex].text; //$('#o-size-dd').find(':selected').text();
    function getWidth(name, layoutnames) {
      const layout = layoutnames.filter((layoutname) => layoutname.name === name);
      return layout[0] ? layout[0].map.width : 0;
    }

    function getHeight(name, layoutnames) {
      const layout = layoutnames.filter((layoutname) => layoutname.name === name);
      return layout[0] ? layout[0].map.height : 0;
    }

    const layoutName = buildLayoutString(...buildLayoutObjectsArray());
    if (mapfishConfig) {
      const layoutnames = mapfishConfig.layouts;
      width = getWidth(layoutName, layoutnames);
      height = getHeight(layoutName, layoutnames);
    }

    // switch (format) {
    //  case 'A1':
    //    width = orientationLandscape ? 594 : 420,
    //    height = orientationLandscape ? 420 : 594
    //    break;
    //  case 'A2':
    //    width = orientationLandscape ? 420 : 297,
    //    height = orientationLandscape ? 297 : 420
    //    break;
    //  case 'A3':
    //    width = orientationLandscape ? 297 : 210,
    //    height = orientationLandscape ? 210 : 297
    //    break;
    //  case 'A4':
    //    width = orientationLandscape ? 210 : 400,
    //         height = orientationLandscape ? 149 : 800
    //    break;
    //  case 'A5':
    //    width = orientationLandscape ? 149 : 105,
    //         height = orientationLandscape ? 105 : 149
    //    break;
    //  case 'A6':
    //    width = orientationLandscape ? 105 : 74,
    //         height = orientationLandscape ? 74 : 105
    //    break;
    // }

    return {
      width, // ((width / 25.4)),
      height // ((height / 25.4))
    };
  }

  function togglePrintMenu() {
    if (htmlPrintmenu.classList.contains('o-printmenu-show')) {
      htmlPrintmenu.classList.remove('o-printmenu-show');
    } else {
      let currScale = maputils.resolutionToScale(viewer.getMap().getView().getResolution(), viewer.getProjection()); // Calculate current map scale,

      const factor = (10 ** currScale.toString().length) / 10000;
      currScale = Math.round(currScale / factor) * factor;
      if (currScale >= 10000000) { // If map scale >= 1:ten million then convert to exponential nr of form which rhymes with Mapfish
        currScale = currScale.toExponential().toString().toUpperCase().replace('+', '');
      } else {
        currScale += '.0';
      }

      for (let i = 0; i < htmlScales.options.length; i += 1) {
        if (htmlScales.options[i].value === currScale) {
          htmlScales.selectedIndex = i;
        }
      }

      if (!vector) {
        vector = printarea.printA1();
        const paper = getPaperMeasures();
        printarea.addPreview(htmlScales.value, paper);
        htmlPrintmenu.classList.add('o-printmenu-show');
      } else {
        vector.setVisible(true);
        viewer.getMap().removeLayer(vector);
        vector = printarea.printA1();
        const paper = getPaperMeasures();
        printarea.addPreview(htmlScales.value, paper);
        htmlPrintmenu.classList.add('o-printmenu-show');
      }
    }
  }

  function getAvailableNamesSizes(config) {
    const configLayouts = config.layouts.map((layout) => {
      const name = layout.name.split('-')[0];
      const size = layout.name.split('-')[1];
      return {
        name,
        size
      };
    });

    const namesAndSizes = [];
    // build objects of avaiable sizes for each name
    configLayouts.forEach((a) => {
      let existsAt;

      if (namesAndSizes.length !== 0) {
        namesAndSizes.forEach((o, i) => {
          if (namesAndSizes[i].name === a.name) {
            existsAt = i;
          } else {
            existsAt = -1;
          }
        });

        if (existsAt !== -1) {
          namesAndSizes[existsAt].sizes.push(a.size);
        } else {
          namesAndSizes.push({
            name: a.name,
            sizes: [a.size]
          });
        }
      } else {
        namesAndSizes.push({
          name: a.name,
          sizes: [a.size]
        });
      }
    });
    const nameAndDedupedSizes = namesAndSizes.map((nameAndSize) => {
      const noDuplicateSizes = [];
      nameAndSize.sizes.forEach((el) => {
        if (!noDuplicateSizes.includes(el)) noDuplicateSizes.push(el);
      });
      return { ...nameAndSize, sizes: noDuplicateSizes };
    });
    return nameAndDedupedSizes;
  }

  function getAvailableSizes(layout, config) {
    const availableNamesAndSizes = getAvailableNamesSizes(config);
    const sizesByName = availableNamesAndSizes.filter((name) => name.name === layout);
    if (sizesByName[0]) {
      return sizesByName[0].sizes;
    }
    return [];
  }

  function buildPanel(config) {
    const outputFormats = config.outputFormats.map((format) => format.name.toUpperCase());

    const layoutNames = config.layouts.map((layout) => layout.name.split('-')[0]);

    // Populera mall-lista med endast ett entry per "layout" i config.yaml. Enligt kravspec
    existingLayoutNames = layoutNames.filter(function filterLayoutName(layoutName) {
      if (!this.has(layoutName)) {
        this.set(layoutName, true);
        return true;
      }
      return false;
    }, new Map());

    if (existingLayoutNames.length > 1) {
      hideLayouts = false;
    }

    const dpis = config.dpis.map((dpi) => dpi.value);

    function layoutOptions(layouts) {
      let htmlstring = '';
      for (let i = 0; i < layouts.length; i += 1) {
        htmlstring += `<option value=${layouts[i].name}>${layouts[i].name}</option>`;
      }
      return htmlstring;
    }

    function sizeOptions(sizes) {
      const revSize = sizes.reverse();
      let htmlstring = '';
      for (let i = 0; i < sizes.length; i += 1) {
        const index = (sizes.length - 1) - i;
        htmlstring += `<option value=${index}>${revSize[i]}</option>`;
      }
      return htmlstring;
    }

    function resoOptions(resos) {
      let settings = '';
      resos.forEach((res) => {
        settings += `<option value=${res}>${res}</option>`;
      });
      return settings;
    }

    function formatOptions(formats) {
      let settings = '';
      formats.forEach((format) => {
        settings += `<option value=${format}>${format}</option>`;
      });
      return settings;
    }

    function scaleOptions(inputScales) {
      let settings = '';
      let scales = [...inputScales];
      if (Number.isInteger(largeScaleRestriction)) {
        scales = scales.filter((element) => parseInt(element.value, 10) >= largeScaleRestriction);
      }
      scales.forEach((scale) => {
        settings += `<option value=${scale.value}>${scale.name}</option>`;
      });
      return settings;
    }

    const scales = scaleOptions(config.scales);
    formatselect = Element({
      tagName: 'select',
      innerHTML: formatOptions(outputFormats),
      cls: 'o-dd-input'
    });

    scaleselect = Element({
      tagName: 'select',
      innerHTML: scales,
      cls: 'o-dd-input'
    });

    orientationselect = Element({
      tagName: 'select',
      innerHTML: `<option value='Portrait'> ${orientations[0]} </option>
                        <option value='Landscape'> ${orientations[1]} </option>`,
      cls: 'o-dd-input'
    });

    printDpi = Element({
      tagName: 'select',
      innerHTML: resoOptions(dpis),
      cls: 'o-dd-input'
    });

    let namesAndSizes;
    if (hideLayouts) {
      namesAndSizes = getAvailableSizes(existingLayoutNames[0], config);
      layoutIfHidden = existingLayoutNames;
    } else {
      // layoutselect = document.getElementById('o-layout-dd');
      // namesAndSizes = getAvailableSizes(layoutselect.options[layoutselect.selectedIndex].text);
    }

    sizeselect = Element({
      tagName: 'select',
      cls: 'o-dd-input',
      innerHTML: sizeOptions(namesAndSizes)
    });

    layoutselect = Element({
      tagname: 'select',
      cls: 'o-dd-input',
      innerHTML: layoutOptions(namesAndSizes)
    });

    printCreate = Button({
      cls: 'btn',
      text: 'Skapa',
      methods: { disabled: function disabled(button) { const map = button; map.disabled = true; }, initial: function initial(button) { const fish = button; fish.disabled = false; } },
      click() {
        const map = viewer.getMap();
        const layers = map.getLayers();
        const extent = vector.getSource().getFeatures()[0].getGeometry().getExtent(); // TODO: Finns risk för nullpointer här, även om det alltid endast finns en vector. Borde hanteras bättre
        const centerPoint = getCenter(extent);
        const visibleLayers = layers.getArray().filter((layer) => layer.getVisible());

        visibleLayers.sort((a, b) => {
          if (b.getZIndex() === undefined && a.getZIndex() === undefined) return 0;
          else if (a.getZIndex() < b.getZIndex()) return -1;
          else if (a.getZIndex() > b.getZIndex()) return 1;
          return 0;
        });

        const contract = {
          dpi: htmlResos.value,
          layers: visibleLayers,
          outputFormat: document.getElementById(formatselect.getId()).value.trim().toLowerCase(),
          scale: htmlScales.value,
          orientation: htmlOrientation.value,
          size: htmlSizes.options[htmlSizes.selectedIndex].text,
          title: htmlTitle.value,
          layout: buildLayoutString(...buildLayoutObjectsArray()),
          center: centerPoint
        };

        mapfishPrint.printMap(contract);

        return false;
      }
    });

    clearButton = Button({
      text: 'Stäng',
      cls: 'btn',
      style: 'margin:5px',
      click() {
        const printAreaVector = printarea.getVector();
        if (printAreaVector) {
          printAreaVector.setVisible(false);
          htmlPrintmenu.classList.remove('o-printmenu-show');
        }
        if (mapfishPrint.getPrintStatus() === 'failure') {
          document.getElementById('o-dl-progress').style.display = 'none';
        }
      }
    });

    printButtonTool = Button({
      cls: 'padding-small  box-shadow icon-smaller round light box-shadow',
      icon: '#fa-print',
      click() {
        togglePrintMenu();
      }
    });

    closePrintMenu = Button({
      cls: 'padding-small rounded box-shadow icon-smaller light',
      icon: '#fa-times',
      style: 'position: absolute; right: .5rem;',
      click() {
        const printAreaVector = printarea.getVector();
        if (printAreaVector) { printAreaVector.setVisible(false); }
        htmlPrintmenu.classList.remove('o-printmenu-show');
        if (mapfishPrint.getPrintStatus() === 'failure') {
          document.getElementById('o-dl-progress').style.display = 'none';
        }
      }
    });

    titleInput = Element({
      tagName: 'input',
      type: 'text',
      cls: 'o-text-input'
    });
  }

  // Hides layouts dropdown if there is only one layout in config.yaml
  function hideOrShowLayouts(shouldHide) {
    return !shouldHide
      ? `<div class="o-block"> 
        <span class="o-setting-heading">Mall</span> 
        ${layoutselect.render()}
      </div>` : '';
  }

  // If Mapfish reports very small scales as exponential numbers then convert to decimal
  let scaleAsString;
  function detectAndFixE(scale) {
    if (scale.indexOf('E') > -1) {
      scaleAsString = parseFloat(scale).toString();
      return scaleAsString;
    }
    return scale;
  }

  function checkPrintability(parameter) {
    // specific printability-check
    if (employsArcGISServerWMS) {
      if (parameter === 'dpi') {
        if (htmlResos.value === '300') {
          for (let i = 0; i < htmlSizes.options.length; i += 1) {
            if (htmlSizes.options[i].value < '4') htmlSizes.options[i].disabled = true;
          }
          htmlSizes.value = '4';
          // disable all sizes except A4
        } else if (htmlResos.value === '150') {
          for (let i = 0; i < htmlSizes.options.length; i += 1) {
            if (htmlSizes.options[i].value < '2') htmlSizes.options[i].disabled = true;
            else if (htmlSizes.options[i].value > '1') htmlSizes.options[i].disabled = false;
          }
          // disable sizes A0 and A1, enable the rest
        } else {
          for (let i = 0; i < htmlSizes.options.length; i += 1) {
            htmlSizes.options[i].disabled = false;
          }
          // enable all sizes
        }
      } else if (parameter === 'size') {
        const selectedSize = htmlSizes.options[htmlSizes.selectedIndex].text;
        if (selectedSize === 'A0' || selectedSize === 'A1') {
          for (let i = 0; i < htmlResos.options.length; i += 1) {
            if (htmlResos.options[i].value < '75') htmlResos.options[i].disabled = true;
          }
          htmlResos.value = '75';
          // disable dpis 150 and 300
        } else if (selectedSize === 'A2' || selectedSize === 'A3') {
          for (let i = 0; i < htmlResos.options.length; i += 1) {
            if (htmlResos.options[i].value < '300') htmlResos.options[i].disabled = false;
            else htmlResos.options[i].disabled = true;
          }
          // disable dpi 300 and enable dpi 150
        } else {
          for (let i = 0; i < htmlResos.options.length; i += 1) {
            htmlResos.options[i].disabled = false;
          }
          // enable all dpis
        }
      }
    } else if (htmlSizes.value === '0') { // normal printability-check
      for (let i = 0; i < htmlResos.options.length; i += 1) {
        if (htmlResos.options[i].value === '300') {
          htmlResos.options[i].disabled = true;
          htmlResos.options[i].title = '300 dpi är inte tillgängligt för A0';
        }
      }
    } else if (htmlResos.value === '300') {
      for (let i = 0; i < htmlSizes.options.length; i += 1) {
        if (htmlSizes.options[i].value === '0') {
          htmlSizes.options[i].disabled = true;
          htmlSizes.options[i].title = 'A0 är inte tillgängligt för 300 dpi';
        }
      }
    } else {
      for (let i = 0; i < htmlResos.options.length; i += 1) {
        htmlResos.options[i].disabled = false;
        htmlResos.options[i].title = '';
      }
      for (let i = 0; i < htmlSizes.options.length; i += 1) {
        htmlSizes.options[i].disabled = false;
        htmlSizes.options[i].title = '';
      }
    }
  }

  function bindUIActions() {
    htmlSizes = document.getElementById(sizeselect.getId());
    htmlOrientation = document.getElementById(orientationselect.getId());
    htmlLayouts = document.getElementById(layoutselect.getId());
    htmlScales = document.getElementById(scaleselect.getId());
    htmlResos = document.getElementById(printDpi.getId());
    htmlTitle = document.getElementById(titleInput.getId());

    htmlResos.addEventListener('change', () => {
      checkPrintability('dpi');
    });

    htmlSizes.addEventListener('change', () => {
      const paper = getPaperMeasures(htmlSizes.value);
      let scale = htmlScales.value;
      scale = detectAndFixE(scale);
      scale = scale.split('.')[0];
      printarea.addPreview(scale, paper);
      checkPrintability('size');
    });

    htmlOrientation.addEventListener('change', () => {
      const paper = getPaperMeasures(htmlSizes.value);
      let scale = htmlScales.value;
      scale = detectAndFixE(scale);
      scale = scale.split('.')[0];
      printarea.addPreview(scale, paper);
    });

    htmlScales.addEventListener('change', () => {
      const paper = getPaperMeasures(htmlSizes.value);
      let scale = htmlScales.value;
      scale = detectAndFixE(scale);
      scale = scale.split('.')[0];
      printarea.addPreview(scale, paper);
    });

    if (htmlLayouts) {
      htmlLayouts.addEventListener('change', () => {
        const namesAndSizes = getAvailableSizes(htmlLayouts.options[htmlLayouts.selectedIndex].text, mapfishConfig);
        htmlSizes.empty();
        namesAndSizes.forEach((val, key) => {
          htmlSizes.appendChild(`<option value=${key}>${val}</option>`);
        });
        const paper = getPaperMeasures(htmlSizes.value);
        let scale = htmlScales.value;
        scale = detectAndFixE(scale);
        scale = scale.split('.')[0];
        printarea.addPreview(scale, paper);
      });
    }

    document.getElementById(formatselect.getId()).value = 'PDF';
  }
  const component = Component({
    name: 'printmenu',
    onAdd(evt) {
      viewer = evt.target;
      printarea = Printarea({
        viewer,
        printAreaColor
      });
      mapfishPrint = Mapfishprint(({
        viewer,
        MapfishCreateUrl,
        layerErrorMessage,
        otherErrorMessage,
        printAreaColor
      }));

      const thisComp = this;
      const xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function onReadyStateChangeCallBack() {
        if (this.readyState === 4 && this.status === 200) {
          const json = JSON.parse(this.responseText);
          buildPanel(json);
          mapfishConfig = json;
          thisComp.addComponents([printButtonTool, closePrintMenu, clearButton, printCreate]);
          thisComp.render();
        }
      };
      xmlhttp.open('GET', MapfishInfoUrl);
      xmlhttp.send();
    },
    onInit() {
      hideLayouts = true;
    },
    render() {
      const menuEl = `<form type="submit"> 
                          <div id="o-printmenu" class="o-printmenu"> 
                            <h5 id="o-main-setting-heading">Skriv ut karta${closePrintMenu.render()}</h5> 
                            <div class="o-block"> 
                              <span class="o-setting-heading">Format</span> 
                              ${formatselect.render()}
                            </div> 
                              ${hideOrShowLayouts(hideLayouts, existingLayoutNames)} 
                            <div class="o-block"> 
                              <span class="o-setting-heading">Orientering</span> 
                              ${orientationselect.render()}
                            </div> 
                            <div class="o-block"> 
                              <span class="o-setting-heading">Storlek</span> 
                              ${sizeselect.render()}
                            </div> 
                            <div class="o-block"> 
                              <span class="o-setting-heading">Skala</span> 
                              ${scaleselect.render()}
                            </div> 
                            <div class="o-block"> 
                              <span class="o-setting-heading">Upplösning</span> 
                              ${printDpi.render()} 
                            </div> 
                            <br /> 
                            <div class="o-block"> 
                              <span class="o-setting-heading">Titel<span><br /> 
                              ${titleInput.render()} 
                            </div> 
                            <br /> 
                            <div class="o-block"> 
                              <input type="checkbox" id="o-legend-input" /> 
                              <label for="o-legend-input">Teckenförklaring</label> 
                            </div> 
                              
                            <br /> 
                              <div class="o-block"> 
                              ${printCreate.render()}
                              ${clearButton.render()}
                            </div> 
                            <br /> 
                            <div class="o-block"> 
                              <span id="o-dl-progress">Skapar... <img src="img/spinner.svg" /></span><a id="o-dl-link" href="#">Ladda ner</a>
                            </div> 
                          </div> 
                          </form>`;
      document.getElementById(viewer.getMain().getNavigation().getId()).appendChild(dom.html(printButtonTool.render()));
      document.getElementById(viewer.getMain().getId()).appendChild(dom.html(menuEl));
      this.dispatch('render');
      htmlPrintmenu = document.getElementById('o-printmenu');
      bindUIActions();
    },
    getPrintmenu() {
      return htmlPrintmenu;
    }
  });
  return component;
};

export default Printmenu;
