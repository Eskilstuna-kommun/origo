//import 'Origo'
import LayerAdder from './layeradder';
import { Component, Element as El, Button, dom } from '../../ui';

const layerItem = function layerItem(options = {}) {
  const {
    style: styleOptions = {},
    data = {},
    cls: clsOptions = '',
    sourceUrl,
    viewer,
    sourceFields
  } = options;

  const {
    title,
    layerId,
    description,
    type,
    src
  } = sourceFields;
  const cls = `${clsOptions} item`.trim();
  const style = dom.createStyle(styleOptions);
  let layerAdder;

  return Component({
    getData: () => data,
    onInit() {
      layerAdder = LayerAdder({ 
        viewer,
        layerId: data[layerId.name],
        title: data[title.name],
        type: data[type.name],
        src: data[src.name],
        sourceUrl
      });
      this.addComponent(layerAdder);
    },
    onRender() {
      this.dispatch('render');
    },
    render() {
      return `<li id="${this.getId()}" class="${cls}" style="${style}">
                <div class="flex row">
                  <div class="grow">
                    <div class="text-black text-grey-dark text-normal text-weight-bold">
                      ${data[title.name]}
                    </div>
                    <p class="relative text-grey text-smaller text-height-smaller text-fade overflow-hidden">
                      ${data[description.name]}
                    </p>
                  </div>
                  <div class="flex no-grow no-shrink align-center padding-x-small">
                    ${layerAdder.render()}
                  </div>
                </div>
             </li>`
    }
  });
}

export default layerItem;