"use strict";

var $ = require('jquery');
var utils = require('../utils');
var options = require('./../../conf/printSettings');
var config = require('../../conf/origoConfig');
var print = require('./print');
var printarea = require('./printarea');
var Viewer = require('../viewer');
var ol = require('openlayers');

var mapfishConfig, hideLayouts, layoutIfHidden;
var $printButton, $printButtonTool, $printselect, vector, $scaleselect, $orientationselect, $clearButton, $layoutselect, $defaultPrintButton, $printDpi;

function init() {
	hideLayouts = true;

	$.getJSON(config.printInfo, function(data) {
		buildPanel(data);
		mapfishConfig = data;
	});

	addDefaultPrintButton();

	function buildPanel(config) {
		var outputFormats = config.outputFormats.map(function(format) {
			return format.name.toUpperCase();
		});
		
		var layoutNames = config.layouts.map(function(layout) {
			return layout.name.split('-')[0];
		});

		//Populera mall-lista med endast ett entry per "layout" i config.yaml. Enligt kravspec
		var layouts = layoutNames.filter(function (layoutName) {
			if (!this.has(layoutName)) {
				this.set(layoutName, true);
				return true;
			}
		}, new Map);

		if (layouts.length > 1) {
			hideLayouts = false;
		}

		var dpis = config.dpis.map(function(dpi) {
			return dpi.value;
		});

		var menuEl = '<form type="submit">' +
			'<div id="o-printmenu" class="o-printmenu">' +
				'<h5 id="o-main-setting-heading">Skriv ut karta</h5>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Format</span>' +
					'<select id="o-format-dd" class="o-dd-input">' +
						utils.createDdOptions(outputFormats) +
					'</select>' +
				'</div>' +
					hideOrShowLayouts(hideLayouts, layouts) +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Orientering</span>' +
					'<select id="o-orientation-dd" class="o-dd-input">' +
					'</select>' +
				'</div>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Storlek</span>' +
					'<select id="o-size-dd" class="o-dd-input">' +
					'</select>' +
				'</div>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Skala</span>' +
					'<select id="o-scale-dd" class="o-dd-input">' +

					'</select>' +
				'</div>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Upplösning</span>' +
					'<select id="o-resolution-dd" class="o-dd-input">' +
					utils.createDdOptions(dpis) +
					'</select>' +
				'</div>' +
				'<br />' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Titel<span><br />' +
					'<input id="o-title-input" class="o-text-input" type="text" />' +
				'</div>' +
				'<br />' +
				'<div class="o-block">' +
					'<input type="checkbox" id="o-legend-input" />' +
					'<label for="o-legend-input">Teckenförklaring</label>' +
				'</div>' +
					
				'<br />' +
					'<div class="o-block">' +
					'<button id="o-print-create-button" class="btn" type="button">Skapa</button>' +
					'<button id="o-print-clear-button" class="btn" type="button" style="margin:5px">Avbryt</button>' +
				'</div>' +
				'<br />' +
				'<div class="o-block">' +
					'<span id="o-dl-progress">Skapar... <img src="img/spinner.svg" /></span><a id="o-dl-link" href="#">Ladda ner</a><img id="o-dl-cancel" src="img/png/cancel.png"/>' +
				'</div>' +
			'</div>' +
			'</form>';

		$('#o-map').append(menuEl);
        
        //Populate additional dropdowns, orientations with the help of printSettings, scales from mapfish   
        $('#o-orientation-dd').append($('<option></option>').attr('value', 'Portrait').text(options.orientation[0]));
        $('#o-orientation-dd').append($('<option></option>').attr('value', 'Landscape').text(options.orientation[1]));
        
        $.each(config.scales, function (scaleNr, scale) {
            $('#o-scale-dd').append($('<option></option>').attr('value', scale.value).text(scale.name));
        });
		
		//Set default values for dropdowns
		$('#o-format-dd option[value="PDF"]').attr('selected', 'selected');

		var printButton = utils.createButton({
			id: 'o-printmenu-button-close',
			cls: 'o-no-boxshadow',
			iconCls: 'o-icon-menu-fa-times',
			src: '#fa-times',
			tooltipText: 'Stäng meny',
			tooltipPlacement: 'west'
		});

		$('#o-main-setting-heading').append(printButton);

		var printButtonTool = utils.createButton({
			id: 'o-print-tool',
			iconCls: 'o-icon-fa-print',
			src: '#fa-print'
		});

		$('#o-toolbar-misc').append(printButtonTool);
		$printButtonTool = $('#o-print-tool');
		$printButton = $('#o-printmenu-button-close');
		$printselect = $('#o-size-dd');
		$scaleselect = $('#o-scale-dd');
		$orientationselect = $('#o-orientation-dd');
		$clearButton = $('#o-print-clear-button');
		$layoutselect = $('#o-layout-dd');
		$defaultPrintButton = $('#o-print-button');
		$printDpi = $('#o-resolution-dd');
		
		// get available sizes for selected option and populate size-dd.
		var namesAndSizes;
		if (hideLayouts) {
			namesAndSizes = getAvailableSizes(layouts[0], config);
			layoutIfHidden = layouts;
		} else {
			namesAndSizes = getAvailableSizes($layoutselect.find(":selected").text(), config);
		}
		$.each(namesAndSizes.reverse(), function(key, value) {
			var index = (namesAndSizes.length-1)-key;
			$printselect.append($('<option></option>').attr('value', index).text(value));
		});
		bindUIActions();
	}
}

// Hides layouts dropdown if there is only one layout in config.yaml
function hideOrShowLayouts(shouldHide, layouts) {
	return !shouldHide ? 
		'<div class="o-block">' +
			'<span class="o-setting-heading">Mall</span>' +
			'<select id="o-layout-dd" class="o-dd-input">' +
				utils.createDdOptions(layouts) +
			'</select>' +
		'</div>' : "";
}

function getAvailableNamesSizes(config) {
	var configLayouts = config.layouts.map(function(layout, i) {
		var _name = layout.name.split('-')[0];
		var _size = layout.name.split('-')[1];
		return {name: _name, size: _size}
	});
	
	var namesAndSizes = [];
	// build objects of avaiable sizes for each name
	configLayouts.forEach(function(a) {
		var existsAt;
		
		if (namesAndSizes.length !== 0) {
			namesAndSizes.forEach(function(o, i) {
				if(namesAndSizes[i].name === a.name) {
					existsAt = i;
					return;
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
				})
			}
		} else {
			namesAndSizes.push({
				name: a.name,
				sizes: [a.size]
			});
		}
	});

	namesAndSizes.forEach(function(obj) {
		var noDuplicateSizes = [];		
		$.each(obj.sizes, function(i, el) {
			if ($.inArray(el, noDuplicateSizes) === -1) noDuplicateSizes.push(el);
		});
		obj.sizes = noDuplicateSizes;
	});
	return namesAndSizes;
}

function getAvailableSizes(layout, config) {
	var availableNamesAndSizes = getAvailableNamesSizes(config);
	var sizesByName = availableNamesAndSizes.filter(function(name) {
		return name.name === layout;
	});
	if (sizesByName[0]) {
		return sizesByName[0].sizes;
	} else {
		return [];
	}
}

function bindUIActions() {
	function togglePrintMenu(e) {
		if ($("#o-printmenu").hasClass('o-printmenu-show')) {
			$("#o-printmenu").removeClass('o-printmenu-show');
		} else {
            var currScale = Viewer.getScale(Viewer.getMap().getView().getResolution()); //Calculate current map scale,  
                      
                var factor = Math.pow(10, currScale.toString().length) / 10000;
                currScale = Math.round(currScale/factor) * factor;
                if (currScale>=10000000) { //If map scale >= 1:ten million then convert to exponential nr of form which rhymes with Mapfish
                    currScale = currScale.toExponential().toString().toUpperCase().replace('+',''); 
                } else { 
                    currScale = currScale + ".0"; 
                }    
               
            
            $('#o-scale-dd option').filter(function () { return $(this).val() == currScale; }).prop('selected', true); //Set scale dd to current map scale
            
			if (!vector) {
				vector = printarea.printA1();
				var paper = getPaperMeasures();
				printarea.addPreview($('#o-scale-dd').val(), paper);
				$("#o-printmenu").addClass('o-printmenu-show');
			} else {
				//vector.setVisible(true);
				Viewer.getMap().removeLayer(vector);
				vector = printarea.printA1();
				var paper = getPaperMeasures();
				printarea.addPreview($('#o-scale-dd').val(), paper);
				$("#o-printmenu").addClass('o-printmenu-show');
			}

		}
		e.preventDefault();
	}

	$printButton.on('click', function (e) {
		$("#o-printmenu").removeClass('o-printmenu-show');
		e.preventDefault();
	});

	$printButtonTool.on('click', togglePrintMenu);

	$defaultPrintButton.on('click', togglePrintMenu);

	$clearButton.on('click', function (e) {
		var map = Viewer.getMap();
		var vector = printarea.getVector();
		if(vector){
			vector.setVisible(false);
			$("#o-printmenu").removeClass('o-printmenu-show');
		}	
		e.preventDefault();
	});
	$printselect.change(function () {
		var map = Viewer.getMap();
		var paper = getPaperMeasures($printselect.val());
		var scale = $scaleselect.val();
        scale = detectAndFixE(scale);
		scale = scale.split('.')[0];
		printarea.addPreview(scale, paper);
		checkPrintability();
	});

	$printDpi.change(checkPrintability);

	$layoutselect.change(function () {
		var namesAndSizes = getAvailableSizes($layoutselect.find(":selected").text(), mapfishConfig);
		var sizeDd = $('#o-size-dd');
		sizeDd.empty();
		$.each(namesAndSizes, function(key, value) {
			sizeDd.append($('<option></option>').attr('value', key).text(value));
		});
		var map = Viewer.getMap();
		var paper = getPaperMeasures($printselect.val());
		var scale = $scaleselect.val();
        scale = detectAndFixE(scale);
		scale = scale.split('.')[0];
		printarea.addPreview(scale, paper);
	});

	$scaleselect.change(function () {
		var map = Viewer.getMap();
		var paper = getPaperMeasures($printselect.val());
		var scale = $scaleselect.val();
        scale = detectAndFixE(scale);
		scale = scale.split('.')[0];
		printarea.addPreview(scale, paper);
	});

	$orientationselect.change(function () {
		var map = Viewer.getMap();
		var paper = getPaperMeasures($printselect.val());
		var scale = $scaleselect.val();
        scale = detectAndFixE(scale);
		scale = scale.split('.')[0];
		printarea.addPreview(scale, paper);
	});

	function getPaperMeasures(format) {
		var orientationLandscape = $('#o-orientation-dd').val() == 'Landscape',
			width = 0,
			height = 0;

		// Sätt storlek på polygon till storlek på kartutsnitt
		// Hämta vald mall
		var size = $('#o-size-dd').find(':selected').text();
		
		var layoutName = buildLayoutString.apply(null,buildLayoutObjectsArray());
		if (mapfishConfig) {
			var layoutnames = mapfishConfig.layouts;
			var getWidth = function (name) {
				var layout = layoutnames.filter(function (layoutname) {
					return layoutname.name === name;
				});
				return layout[0] ? layout[0].map.width : 0;
			}
			var getHeight = function (name) {
				var layout = layoutnames.filter(function (layoutname) {
					return layoutname.name === name;
				});
				return layout[0] ? layout[0].map.height : 0;
			}
			;
			width = getWidth(layoutName); 
			height = getHeight(layoutName);
		}

		// switch (format) {
		// 	case 'A1':
		// 		width = orientationLandscape ? 594 : 420,
		// 		height = orientationLandscape ? 420 : 594
		// 		break;
		// 	case 'A2':
		// 		width = orientationLandscape ? 420 : 297,
		// 		height = orientationLandscape ? 297 : 420
		// 		break;
		// 	case 'A3':
		// 		width = orientationLandscape ? 297 : 210,
		// 		height = orientationLandscape ? 210 : 297
		// 		break;
		// 	case 'A4':
		// 		width = orientationLandscape ? 210 : 400,
        //         height = orientationLandscape ? 149 : 800
		// 		break;
		// 	case 'A5':
		// 		width = orientationLandscape ? 149 : 105,
        //         height = orientationLandscape ? 105 : 149
		// 		break;
		// 	case 'A6':
		// 		width = orientationLandscape ? 105 : 74,
        //         height = orientationLandscape ? 74 : 105
		// 		break;
		// }
		
		return {
			width: width,	//((width / 25.4)),
			height: height	//((height / 25.4))
		};
	};


	$('#o-print-create-button').click(function (event) {
		var map = Viewer.getMap();
		var layers = map.getLayers();
		var extent = vector.getSource().getFeatures()[0].getGeometry().getExtent(); //TODO: Finns risk för nullpointer här, även om det alltid endast finns en vector. Borde hanteras bättre
		var centerPoint =  ol.extent.getCenter(extent);
		var visibleLayers = layers.getArray().filter(function(layer) {
			return layer.getVisible();
		});

		var contract = {
			dpi: $('#o-resolution-dd').val(),
			layers: visibleLayers,
			outputFormat: $('#o-format-dd').val().trim().toLowerCase(),
			scale: $('#o-scale-dd').val(),
			orientation: $('#o-orientation-dd').val(),
			size: $('#o-size-dd').find(':selected').text(),
			title: $('#o-title-input').val(),
			layout: buildLayoutString.apply(null,buildLayoutObjectsArray()),
			center: centerPoint
		};
		
		// Abort pending ajax request
		var request = print.printMap(contract);
		$('#o-dl-cancel').click(function() {
			request.abort();
			$('#o-dl-progress').hide();
			$('#o-dl-cancel').hide();
		});

		return false;
	});
}
//If Mapfish reports very small scales as exponential numbers then convert to decimal
function detectAndFixE(scale) {
   if (scale.indexOf('E') > -1) {              
       scale = parseFloat(scale).toString();
    }
    return scale;
}

function buildLayoutObjectsArray() {
    var layoutObjectsArray = [];
    hideLayouts ? layoutObjectsArray = [layoutIfHidden, $('#o-size-dd').find(':selected').text(), $('#o-orientation-dd').val()]: layoutObjectsArray = [$('#o-layout-dd').val(), $('#o-size-dd').find(':selected').text(), $('#o-orientation-dd').val()];
    
    if ($('#o-title-input').val()!="") {
            layoutObjectsArray.push("Title");
    }
    if ($('#o-legend-input').is(":checked")) {
            layoutObjectsArray.push("Legend");
    }
    return layoutObjectsArray;
}
//Three to five arguments expected
//Title and Legend are optional, layoutName and paperSize and orientation are not
function buildLayoutString() {
    if (arguments.length == 3) {
        return arguments[0] + '-' + arguments[1] + '-' + arguments[2];
    }
    else if (arguments.length == 4) { 
        return arguments[0] + '-' + arguments[1] + '-' + arguments[2] + '-' + arguments[3];
        
    }
    else if (arguments.length == 5) {
        return arguments[0] + '-' + arguments[1] + '-' + arguments[2] + '-' + arguments[3] + '-' + arguments[4];
    }
}

function addDefaultPrintButton(){
 var skrivUtKnapp = utils.createListButton({
  id: 'o-print',
  iconCls: 'o-icon-fa-print',
  src: '#fa-print',
  text: 'Skriv ut'
 });
 $('#o-menutools').append(skrivUtKnapp);
}

function checkPrintability(){
	if($printselect.val() == '0'){
		$printDpi.children('[value=300]').prop('disabled', true);
		$printDpi.children('[value=300]').attr('title', '300 dpi är inte tillgänglig för A0');
	}
	else if( $printDpi.val() == '300' ){
		$printselect.children('[value=0]').prop('disabled', true);
		$printselect.children('[value=0]').attr('title', 'A0 är inte tillgänglig i 300 dpi');
	}
	else{
		$printDpi.children('[value=300]').prop('disabled', false);
		$printselect.children('[value=0]').prop('disabled', false);
		$printDpi.children('[value=300]').attr('title', '');
		$printselect.children('[value=0]').attr('title', '');
	}
}

module.exports.init = init;