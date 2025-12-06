// --- 1. 定義地圖與基本圖層 ---
const rasterLayer = new ol.layer.Tile({ source: new ol.source.OSM() });
const vectorSource = new ol.source.Vector(); 
const vectorLayer = new ol.layer.Vector({ source: vectorSource });

const measureSource = new ol.source.Vector();
const measureLayer = new ol.layer.Vector({
    source: measureSource,
    style: new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
        stroke: new ol.style.Stroke({ color: '#ffcc33', width: 2 }),
        image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: '#ffcc33' }) })
    })
});

const view = new ol.View({ center: ol.proj.fromLonLat([120.6468, 24.1618]), zoom: 12 }); // Zoom 稍微拉遠一點看全貌

const map = new ol.Map({
    target: 'map',
    layers: [rasterLayer, vectorLayer, measureLayer],
    view: view,
    controls: ol.control.defaults().extend([]) 
});

// --- 2. 設定功能 ---
const fullScreenControl = new ol.control.FullScreen();
const overviewMapControl = new ol.control.OverviewMap({
    layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
    collapsed: false
});
const zoomSliderControl = new ol.control.ZoomSlider();

map.addControl(overviewMapControl);

const ckbFullScreen = document.getElementById('ckbFullScreen');
if(ckbFullScreen) {
    ckbFullScreen.addEventListener('change', function() {
        if(this.checked) map.addControl(fullScreenControl);
        else map.removeControl(fullScreenControl);
    });
}

const ckbOverviewMap = document.getElementById('ckbOverviewMap');
if(ckbOverviewMap) {
    ckbOverviewMap.addEventListener('change', function() {
        if(this.checked) map.addControl(overviewMapControl);
        else map.removeControl(overviewMapControl);
    });
}

const ckbZoomSlider = document.getElementById('ckbZoomSlider');
if(ckbZoomSlider) {
    ckbZoomSlider.addEventListener('change', function() {
        if(this.checked) map.addControl(zoomSliderControl);
        else map.removeControl(zoomSliderControl);
    });
}

// --- 3. 快速定位功能 ---
function goToLocation(value, text) {
    document.getElementById('currentLocText').innerText = text;
    let centerCoords;
    let zoomLevel = 14;

    if (value === 'xitun') centerCoords = [120.6468, 24.1618];
    else if (value === 'beitun') centerCoords = [120.7050, 24.1800];
    else if (value === 'wuqi') centerCoords = [120.5283, 24.2623];
    else if (value === 'west') centerCoords = [120.6630, 24.1500];
    else if (value === 'fengyuan') {
        centerCoords = [120.7190, 24.2540];
        zoomLevel = 13;
    }

    if (centerCoords) {
        view.animate({
            center: ol.proj.fromLonLat(centerCoords),
            zoom: zoomLevel,
            duration: 1500 
        });
    }
}

// --- 4. 量測工具 ---
let draw; 
function addInteraction(type) {
    if (draw) map.removeInteraction(draw);
    draw = new ol.interaction.Draw({
        source: measureSource,
        type: type,
        style: new ol.style.Style({
            fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
            stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 2 }),
            image: new ol.style.Circle({ radius: 5, stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.7)' }), fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }) })
        })
    });
    map.addInteraction(draw);

    draw.on('drawend', function(evt) {
        const geom = evt.feature.getGeometry();
        let output;
        if (geom instanceof ol.geom.Polygon) {
            const area = ol.sphere.getArea(geom);
            output = (area > 10000) ? (Math.round(area / 1000000 * 100) / 100 + ' ' + 'km²') : (Math.round(area * 100) / 100 + ' ' + 'm²');
            alert("測量面積: " + output);
        } else if (geom instanceof ol.geom.LineString) {
            const length = ol.sphere.getLength(geom);
            output = (length > 100) ? (Math.round(length / 1000 * 100) / 100 + ' ' + 'km') : (Math.round(length * 100) / 100 + ' ' + 'm');
            alert("測量距離: " + output);
        }
        map.removeInteraction(draw); 
    });
}

function clearMeasure() {
    measureSource.clear();
    if (draw) {
        map.removeInteraction(draw);
        draw = null;
    }
}

// --- 5. Popup 邏輯 (大幅修改：依照你的需求顯示不同資訊) ---
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');
const overlay = new ol.Overlay({ element: container, autoPan: true, autoPanAnimation: { duration: 250 } });
map.addOverlay(overlay);
closer.onclick = function () { overlay.setPosition(undefined); closer.blur(); return false; };

map.on('singleclick', function (evt) {
    if (draw) return;
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) { return feature; });
    
    if (feature && feature.get('type')) { 
        const coordinates = feature.getGeometry().getCoordinates();
        const props = feature.getProperties();
        
        // 1. 標題全部改粗體 (使用 font-weight: 900)
        let html = `<h6 style="font-weight: 900; font-size: 16px; margin-bottom: 8px;">${props.name}</h6><hr style="margin:5px 0;">`;
        
        // 2. 社會住宅：顯示狀態、總戶數
        if (props.type === 'social') {
            html += `<div><b>狀態:</b> ${props.status}</div>`;
            // 如果沒有戶數資料，顯示暫無資料
            html += `<div><b>總戶數:</b> ${props.totalUnits || '規劃中'} 戶</div>`;
        }
        
        // 3. 租賃市場：顯示價格、類型、戶型
        else if (props.type === 'rent') {
            html += `<div><b>價格:</b> ${props.price}</div>`;
            html += `<div><b>類型:</b> ${props.subType === 'managed' ? '包租代管' : '一般出租'}</div>`;
            html += `<div><b>戶型:</b> ${props.layout || '套房'}</div>`;
        }
        
        // 4. 購屋市場：顯示平均單價、房價漲幅 (正綠負紅)
        else if (props.type === 'buy') {
            html += `<div><b>平均單價:</b> ${props.price}</div>`;
            
            // 處理漲幅顏色邏輯
            let rateHtml = '';
            if (props.growthRate) {
                // 將字串轉為數字判斷 (例如 "+5.2" -> 5.2)
                const rateVal = parseFloat(props.growthRate);
                let color = '#333'; // 預設黑
                let arrow = '';

                if (rateVal > 0) {
                    color = '#27ae60'; // 綠色
                    arrow = '▲';
                } else if (rateVal < 0) {
                    color = '#e74c3c'; // 紅色
                    arrow = '▼';
                }
                
                rateHtml = `<span style="color: ${color}; font-weight: bold;">${arrow} ${props.growthRate}%</span>`;
            } else {
                rateHtml = '<span style="color: #999;">--</span>';
            }

            html += `<div><b>房價漲幅(YoY):</b> ${rateHtml}</div>`;
            html += `<div style="margin-top:8px;">
                <a href="https://lvr.land.moi.gov.tw/" target="_blank" " class="btn btn-sm btn-primary btn-block">
                    <i class="fa-solid fa-external-link-alt"></i> 查看實價登錄
                </a>
            </div>`;
        }
        
        content.innerHTML = html;
        overlay.setPosition(coordinates);
    } else {
        overlay.setPosition(undefined);
    }
});

// --- 6. 核心樣式與圖例控制 ---

// 樣式函式
const styleFunction = function(feature, resolution) {
    
    const type = feature.get('type');
    const status = feature.get('status');
    const subType = feature.get('subType');
    const name = feature.get('name');
    const customColor = feature.get('color'); 
    
    const zoom = map.getView().getZoomForResolution(resolution);

    let fillColor = '#3498db'; 
    let radius = 8; 

    if (type === 'social') {
        if (status === '已完工') fillColor = '#2980b9'; 
        else if (status === '興建中') fillColor = '#f39c12'; 
        else fillColor = '#95a5a6'; 
    } else if (type === 'rent') {
        if (subType === 'managed') fillColor = '#17a2b8'; 
        else fillColor = '#27ae60'; 
    } else if (type === 'buy') {
        fillColor = customColor || '#8e44ad';
        radius = 45; 
    }

    let textStyle = null;
    if (zoom >= 15) {
        textStyle = new ol.style.Text({
            text: name,           
            scale: 1.3,
            textAlign: 'left',    
            offsetX: (type === 'buy') ? 0 : 15,
            offsetY: 0,
            fill: new ol.style.Fill({ color: '#000000' }),
            stroke: new ol.style.Stroke({ color: '#FFFF99', width: 3.5 })
        });
    }

    if (type === 'social') {
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({ color: fillColor }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
            }),
            text: textStyle
        });
    }

    if (type === 'rent') {
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({ color: fillColor }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
            }),
            text: textStyle
        });
    }

    if (type === 'buy') {
        const colorArray = ol.color.asArray(fillColor);
        colorArray[3] = 0.4; 

        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: radius, 
                fill: new ol.style.Fill({ color: colorArray }), 
                stroke: new ol.style.Stroke({ color: '#fff', width: 1 }) 
            }),
            text: textStyle
        });
    }
};

function updateLegend(category) {
    const legendDiv = document.getElementById('map-legend');
    legendDiv.style.display = 'block'; 
    let html = '';

    if (category === 'social') {
        html += `<h6>社會住宅圖例</h6>`;
        html += `<div class="legend-item"><div class="legend-color" style="background-color: #2980b9;"></div>已完工</div>`;
        html += `<div class="legend-item"><div class="legend-color" style="background-color: #f39c12;"></div>興建中</div>`;
    } else if (category === 'rent') {
        html += `<h6>租賃市場圖例</h6>`;
        html += `<div class="legend-item"><div class="legend-color" style="background-color: #17a2b8;"></div>包租代管</div>`;
        html += `<div class="legend-item"><div class="legend-color" style="background-color: #27ae60;"></div>一般出租</div>`;
    } else if (category === 'buy') {
        html += `<h6>購屋市場圖例</h6>`;
        html += `<div class="legend-item"><div class="legend-color" style="background-color: #e74c3c;"></div>房價熱區 (高)</div>`;
        html += `<div class="legend-item"><div class="legend-color" style="background-color: #e67e22;"></div>房價熱區 (中)</div>`;
        html += `<div class="legend-item"><div class="legend-color" style="background-color: #27ae60;"></div>房價熱區 (低)</div>`;
    }

    legendDiv.innerHTML = html;
}

function loadLayer(category) {
    vectorSource.clear(); 
    overlay.setPosition(undefined);
    updateLegend(category); 
    
    let dataToLoad = [];
    if (category === 'social') dataToLoad = socialHousingData;
    else if (category === 'rent') dataToLoad = rentData;
    else if (category === 'buy') dataToLoad = buyData;

    dataToLoad.forEach(item => {
        const point = new ol.geom.Point(ol.proj.fromLonLat([item.lng, item.lat]));
        const feature = new ol.Feature({ 
            geometry: point, 
            name: item.name, 
            status: item.status, 
            price: item.price, 
            type: item.type,
            subType: item.subType,
            color: item.color,
            // 將新增加的資料欄位也放進 feature 裡，不然 styleFunction 讀不到
            totalUnits: item.totalUnits,
            layout: item.layout,
            growthRate: item.growthRate
        });
        
        feature.setStyle(styleFunction);
        vectorSource.addFeature(feature);
    });

    if (dataToLoad.length > 0) {
        const extent = vectorSource.getExtent();
        map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
    }
}

// --- 7. 資料 (已擴充欄位：totalUnits, layout, growthRate) ---
const socialHousingData = [
    { name: "烏日區高鐵社會住宅", status: "興建中", lat: 24.107, lng: 120.599, type: "social", totalUnits: "270" },
    { name: "西屯區國安一期社會住宅", status: "已完工", lat: 24.191, lng: 120.614, type: "social", totalUnits: "500" },
    { name: "西屯區國安二、三期社會住宅", status: "興建中", lat: 24.191, lng: 120.613, type: "social", totalUnits: "780" },
    { name: "西屯區市政社會住宅", status: "興建中", lat: 24.167, lng: 120.647, type: "social", totalUnits: "400" },
    { name: "西屯區中央公園社會住宅", status: "興建中", lat: 24.191, lng: 120.658, type: "social", totalUnits: "125" },
    { name: "梧棲區三民社會住宅", status: "已完工", lat: 24.250, lng: 120.529, type: "social", totalUnits: "300" },
    { name: "豐原區安康一期社會住宅", status: "已完工", lat: 24.240, lng: 120.722, type: "social", totalUnits: "200" },
    { name: "豐原區安康段二期社會住宅", status: "興建中", lat: 24.240, lng: 120.723, type: "social", totalUnits: "500" },
    { name: "北屯區巨蛋一期社會住宅", status: "興建中", lat: 24.197, lng: 120.664, type: "social", totalUnits: "350" },
    { name: "北屯區北屯社會住宅", status: "已完工", lat: 24.163, lng: 120.697, type: "social", totalUnits: "220" },
    { name: "北屯區巨蛋二期社會住宅", status: "興建中", lat: 24.198, lng: 120.665, type: "social", totalUnits: "400" },
    { name: "北屯區洲際社會住宅", status: "興建中", lat: 24.198, lng: 120.686, type: "social", totalUnits: "380" }
];

const rentData = [
    { name: "逢甲溫馨套房", price: "8,500元/月", lat: 24.178, lng: 120.645, type: "rent", subType: "general", layout: "獨立套房" },
    { name: "市政路高級公寓", price: "28,000元/月", lat: 24.155, lng: 120.640, type: "rent", subType: "managed", layout: "2房1廳" },
    { name: "捷運文心櫻花兩房", price: "19,000元/月", lat: 24.165, lng: 120.655, type: "rent", subType: "general", layout: "2房2廳" },
    { name: "西屯路機能小宅", price: "7,500元/月", lat: 24.172, lng: 120.643, type: "rent", subType: "general", layout: "分租套房" },
    { name: "青海路時尚套房", price: "11,000元/月", lat: 24.168, lng: 120.648, type: "rent", subType: "managed", layout: "獨立套房" },
    { name: "台灣大道景觀三房", price: "35,000元/月", lat: 24.162, lng: 120.649, type: "rent", subType: "general", layout: "3房2廳" },
    { name: "中科商圈優質社區", price: "22,000元/月", lat: 24.185, lng: 120.615, type: "rent", subType: "managed", layout: "2房1廳" },
    { name: "東海大學獨立套房", price: "6,000元/月", lat: 24.180, lng: 120.590, type: "rent", subType: "general", layout: "獨立套房" },
    { name: "七期豪宅分租", price: "40,000元/月", lat: 24.158, lng: 120.635, type: "rent", subType: "managed", layout: "3房2廳" },
    { name: "水湳經貿園區新成屋", price: "24,000元/月", lat: 24.190, lng: 120.660, type: "rent", subType: "general", layout: "2房2廳" },
    { name: "北屯好事多旁兩房", price: "20,000元/月", lat: 24.188, lng: 120.705, type: "rent", subType: "managed", layout: "2房1廳" },
    { name: "太原車站共生公寓", price: "9,000元/月", lat: 24.160, lng: 120.710, type: "rent", subType: "general", layout: "雅房" },
    { name: "一中商圈學生套房", price: "6,500元/月", lat: 24.150, lng: 120.685, type: "rent", subType: "general", layout: "分租套房" },
    { name: "中國醫藥大學附近雅房", price: "5,500元/月", lat: 24.155, lng: 120.682, type: "rent", subType: "general", layout: "雅房" },
    { name: "勤美綠園道景觀房", price: "30,000元/月", lat: 24.150, lng: 120.665, type: "rent", subType: "managed", layout: "2房2廳" },
    { name: "南區大慶車站旁", price: "12,000元/月", lat: 24.115, lng: 120.655, type: "rent", subType: "general", layout: "獨立套房" },
    { name: "興大路書香世家", price: "15,000元/月", lat: 24.120, lng: 120.675, type: "rent", subType: "managed", layout: "2房1廳" },
    { name: "大里軟體園區套房", price: "8,000元/月", lat: 24.085, lng: 120.690, type: "rent", subType: "general", layout: "獨立套房" },
    { name: "烏日高鐵特區三房", price: "26,000元/月", lat: 24.105, lng: 120.620, type: "rent", subType: "managed", layout: "3房2廳" },
    { name: "嶺東科大整層住家", price: "16,000元/月", lat: 24.135, lng: 120.605, type: "rent", subType: "general", layout: "3房2廳" }
];

const buyData = [
    { name: "七期重劃區", price: "65萬/坪", lat: 24.160, lng: 120.635, type: "buy", color: '#e74c3c', growthRate: "+8.5" },
    { name: "水湳經貿園區", price: "60萬/坪", lat: 24.185, lng: 120.655, type: "buy", color: '#e74c3c', growthRate: "+12.3" },
    { name: "北屯14期重劃區", price: "55萬/坪", lat: 24.188, lng: 120.678, type: "buy", color: '#e67e22', growthRate: "+5.6" },
    { name: "烏日高鐵特區", price: "40萬/坪", lat: 24.105, lng: 120.620, type: "buy", color: '#e67e22', growthRate: "+3.2" },
    { name: "台中港市鎮中心", price: "28萬/坪", lat: 24.254, lng: 120.524, type: "buy", color: '#27ae60', growthRate: "-1.5" },
    { name: "北屯機捷特區", price: "45萬/坪", lat: 24.182, lng: 120.705, type: "buy", color: '#e67e22', growthRate: "+2.1" },
    { name: "單元十二", price: "42萬/坪", lat: 24.175, lng: 120.710, type: "buy", color: '#e67e22', growthRate: "+1.8" },
    { name: "舊市區(中區/西區)", price: "35萬/坪", lat: 24.140, lng: 120.680, type: "buy", color: '#27ae60', growthRate: "-0.5" }
];

// 預設載入社會住宅
loadLayer('social');