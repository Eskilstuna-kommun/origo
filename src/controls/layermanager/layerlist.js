//import 'Origo';
import LayerItem from './layeritem';
import { Component, Element as El, Button, dom } from '../../ui';
import layerRequester from './layerrequester';

const LayerList = function LayerList(options = {}) {
  const {
    cls: clsSettings = '',
    sourceFields,
    sourceUrl,
    url,
    viewer
  } = options;

  let layerItems;
  let scrollPos; //control scroll position when loading in more
  const searchFields = Object.keys(sourceFields).reduce((prev, curr) => {
    if (sourceFields[curr].searchable) {
      return prev.concat(curr);
    }
    return prev;
  }, []);

  const renderListItems = components => components.reduce((acc, comp) => acc + comp.render(), '');

  const sortAscending = (list, key) => {
    if (key) {
      return list.sort((a,b) => (a[key] > b[key]) ? 1 : ((b[key] > a[key]) ? -1 : 0))
    }
    return list;
  };

  const createLayerItems = (list) => {
    //const sorted = sortAscending(list, sourceFields.title.name);
    //let CSW-call do the sorting
    return list.map((layer) => {
      return LayerItem({ 
        data: layer,
        sourceFields,
        sourceUrl,
        url,
        viewer
      });
    });
  };

  const findMatch = (searchString, data) => {
    const isMatch = searchFields.reduce((result, field) => {
      const searchField = sourceFields[field].name;
      if (searchField) {
        let searchData = data[searchField];
        if (searchData) {
          searchData = searchData.toLowerCase();
          if (searchData.search(searchString) > -1) return true;
        }        }
      return result;
    }, false);
    return isMatch;
  };

  const searchByText = function searchByText(searchString) {
    const matches = layerItems.filter((layerItem) => {
      const data = layerItem.getData();
      const isMatch = findMatch(searchString, data);
      return isMatch;
    });
    return matches;
  };

  

  return Component({
    addLayers(list) {
      layerItems = createLayerItems(list);
      this.addComponents(layerItems);
      this.update();
    },
    onRender(){
      scrollPos = 0
    },
    render(cmps) {
      const components = cmps ? cmps : this.getComponents();
      return `<div id="${this.getId()}" class="o-list-container flex column overflow-auto-y padding-right-large">
                <ul class="divided list">${renderListItems(components)}</ul>
              </div>`
    },
    search(searchText) {
      console.log("search")
      layerRequester({ searchText : searchText }); //new request with searchstring
      scrollPos = document.getElementById(this.getId()).scrollTop 
      // const matches = searchByText(searchText);
      // this.clearComponents();
      // this.addComponents(matches);
      // this.update(matches);
    },
    update(cmps) {
      const el = document.getElementById(this.getId());
      const htmlString = cmps ? this.render(cmps) : this.render();
      const newEl = dom.html(htmlString);
      el.parentNode.replaceChild(newEl, el);
      this.dispatch('render'); 
      //After rendering and updating is done, set the scroll event
      const currentEl = document.getElementById(this.getId())    
      currentEl.addEventListener('scroll', () => {
        if(currentEl.scrollTop == currentEl.scrollHeight - currentEl.offsetHeight){
          scrollPos = currentEl.scrollHeight - currentEl.offsetHeight
          let searchText = currentEl.parentNode.getElementsByTagName("input")[0].value
          layerRequester({searchText, startRecord: this.getComponents().length+1, extend : true})
        } 
      })
      currentEl.scrollTop = scrollPos
    }
  });
};

export default LayerList;