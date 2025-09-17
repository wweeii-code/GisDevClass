const defaultControls = ol.control.defaults;
const FullScreen = ol.control.FullScreen;
const OverviewMap = ol.control.OverviewMap;
const ZoomSlider = ol.control.ZoomSlider;
const DragRotateAndZoom = ol.interaction.DragRotateAndZoom;
const defaultInteractions = ol.interaction.defaults;

const source = new ol.source.OSM();
const overviewMapControl = new OverviewMap({
  layers: [
    new ol.layer.Tile({
      source: source,
    }),
  ],
});

const view = new ol.View({
  center: ol.proj.fromLonLat([120.6499, 24.1808]),
  zoom: 16
});

//new ol.Map() 建立地圖
var map = new ol.Map({
  interactions: defaultInteractions().extend([new DragRotateAndZoom()]),
  controls: defaultControls().extend([overviewMapControl, new FullScreen(), new ZoomSlider()]),
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: source
    })
  ],
  view: view
});