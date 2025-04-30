import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

console.log('Swiper loaded:', typeof Swiper);

const modelConfigs = [
    { id: 'model-supersite', path: '/static/models/supersite.glb' },
    { id: 'model-billboard', path: '/static/models/billboard.glb' },
    { id: 'model-lightposter', path: '/static/models/lightposter.glb' },
    { id: 'model-multipillar', path: '/static/models/multipillar.glb' }
];

function init3DModel(containerId, modelPath) {
    console.log(`Инициализация модели: ${containerId}, путь: ${modelPath}`);
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Контейнер с ID ${containerId} не найден`);
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // Прозрачный фон
    container.appendChild(renderer.domElement);
    console.log(`Рендерер добавлен в контейнер ${containerId}`);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.0);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    const loader = new GLTFLoader();
    let model;
    loader.load(
        modelPath,
        (gltf) => {
            model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            model.position.y += size.y / 4;
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDimension;
            model.scale.set(scale, scale, scale);
            scene.add(model);
            console.log(`Модель ${modelPath} успешно загружена`);
        },
        (progress) => {
            console.log(`Загрузка ${modelPath}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
            console.error(`Ошибка загрузки модели ${modelPath}:`, error);
        }
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = Math.PI / 2;
    camera.position.set(0, 1, 5);
    controls.update();

    function animate() {
        requestAnimationFrame(animate);
        if (model) model.rotation.y += 0.01;
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

let swiperInstance;
if (typeof Swiper === 'undefined') {
    console.error('Swiper не загружен. Убедитесь, что Swiper подключен.');
} else {
    swiperInstance = new Swiper('.banner-slider', {
        slidesPerView: 1,
        spaceBetween: 10,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        on: {
            init: function () {
                const activeSlide = this.slides[this.activeIndex];
                const bannerType = activeSlide.querySelector('.banner-option').dataset.type;
                document.getElementById('bannerType').value = bannerType;
            },
            slideChange: function () {
                const activeSlide = this.slides[this.activeIndex];
                const bannerType = activeSlide.querySelector('.banner-option').dataset.type;
                document.getElementById('bannerType').value = bannerType;
            },
        },
    });
}

modelConfigs.forEach(config => {
    init3DModel(config.id, config.path);
});

function setupOptionButtons(buttonGroupId, inputId) {
    const buttons = document.querySelectorAll(`#${buttonGroupId} .option-btn`);
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(inputId).value = button.dataset.value;
        });
        if (!document.querySelector(`#${buttonGroupId} .option-btn.active`)) {
            buttons[0].classList.add('active');
            document.getElementById(inputId).value = buttons[0].dataset.value;
        }
    });
}

setupOptionButtons('material-buttons', 'material');
setupOptionButtons('type-buttons', 'type');
setupOptionButtons('urgency-buttons', 'urgency');
setupOptionButtons('season-buttons', 'season');
setupOptionButtons('design-buttons', 'design');
setupOptionButtons('materialDefect-buttons', 'materialDefect');

let calculatedCost = 0;

async function fetchPricing() {
    try {
        const response = await fetch('/get-pricing', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            return data.pricing;
        } else {
            throw new Error('Не удалось загрузить настройки цен');
        }
    } catch (error) {
        console.error('Ошибка при получении цен:', error);
        document.getElementById('result').innerText = 'Ошибка при загрузке цен. Используются значения по умолчанию.';
        return null;
    }
}

async function calculateCost() {
    const pricing = await fetchPricing();
    if (!pricing) {
        // Используем значения по умолчанию, если не удалось загрузить цены
        return calculateWithDefaults();
    }

    const area = parseFloat(document.getElementById('area').value) || 0;
    const bannerType = document.getElementById('bannerType').value;
    const material = document.getElementById('material').value;
    const type = document.getElementById('type').value;
    const urgency = document.getElementById('urgency').value;
    const season = document.getElementById('season').value;
    const design = document.getElementById('design').value;
    const additionalArea = parseFloat(document.getElementById('additionalArea').value) || 0;
    const materialDefect = document.getElementById('materialDefect').value;
    const orderVolume = parseInt(document.getElementById('orderVolume').value) || 0;
    const deliveryDistance = parseInt(document.getElementById('deliveryDistance').value) || 0;

    console.log('area:', area);
    console.log('bannerType:', bannerType);
    console.log('material:', material);
    console.log('type:', type);
    console.log('urgency:', urgency);
    console.log('season:', season);
    console.log('design:', design);
    console.log('materialDefect:', materialDefect);
    console.log('orderVolume:', orderVolume);
    console.log('deliveryDistance:', deliveryDistance);

    if (area <= 0 || !bannerType || !material || !type || !urgency || !season || !design || !materialDefect || orderVolume <= 0) {
        document.getElementById('result').innerText = "Пожалуйста, заполните все поля корректно (площадь и объем заказа должны быть больше 0).";
        document.getElementById('submit-order-btn').disabled = true;
        return;
    }

    const baseCost = parseFloat(pricing.base_cost);
    let bannerCost = 0;
    let materialCost = 0;
    let typeCost = 0;
    let urgencyCost = 0;
    let seasonCost = 0;
    let designCost = 0;
    let materialDefectCost = 0;
    let additionalAreaCost = additionalArea * parseFloat(pricing.additional_area_cost);
    let volumeDiscount = orderVolume >= parseFloat(pricing.volume_discount_threshold) ? parseFloat(pricing.volume_discount) : 0;
    let deliveryCost = deliveryDistance * parseFloat(pricing.delivery_cost_per_km);

    switch (bannerType) {
        case "1": bannerCost = parseFloat(pricing.banner_type_1); break;
        case "2": bannerCost = parseFloat(pricing.banner_type_2); break;
        case "3": bannerCost = parseFloat(pricing.banner_type_3); break;
        case "4": bannerCost = parseFloat(pricing.banner_type_4); break;
    }

    switch (material) {
        case "1": materialCost = parseFloat(pricing.material_1); break;
        case "2": materialCost = parseFloat(pricing.material_2); break;
        case "3": materialCost = parseFloat(pricing.material_3); break;
    }

    switch (type) {
        case "1": typeCost = parseFloat(pricing.work_type_1); break;
        case "2": typeCost = parseFloat(pricing.work_type_2); break;
        case "3": typeCost = parseFloat(pricing.work_type_3); break;
    }

    urgencyCost = urgency === "2" ? parseFloat(pricing.urgency_2) : urgency === "3" ? parseFloat(pricing.urgency_3) : 0;
    seasonCost = season === "1" ? parseFloat(pricing.season_1) : season === "3" ? parseFloat(pricing.season_3) : 0;
    designCost = design === "2" ? parseFloat(pricing.design_2) : design === "3" ? parseFloat(pricing.design_3) : 0;
    materialDefectCost = materialDefect === "2" ? parseFloat(pricing.material_defect_2) : materialDefect === "3" ? parseFloat(pricing.material_defect_3) : 0;

    calculatedCost = ((baseCost + bannerCost + materialCost + typeCost) * area + additionalAreaCost) * 
        (1 + urgencyCost + seasonCost + designCost + materialDefectCost - volumeDiscount) + 
        deliveryCost;

    document.getElementById('result').innerText = `Стоимость: ${calculatedCost.toFixed(2)} руб.`;
    const isLoggedIn = document.getElementById('auth-links').innerHTML.includes('Личный кабинет');
    if (isLoggedIn) {
        document.getElementById('submit-order-btn').disabled = false;
    } else {
        document.getElementById('submit-order-btn').disabled = true;
        document.getElementById('result').innerText += '\nПожалуйста, авторизуйтесь, чтобы отправить заказ.';
    }
}

function calculateWithDefaults() {
    const area = parseFloat(document.getElementById('area').value) || 0;
    const bannerType = document.getElementById('bannerType').value;
    const material = document.getElementById('material').value;
    const type = document.getElementById('type').value;
    const urgency = document.getElementById('urgency').value;
    const season = document.getElementById('season').value;
    const design = document.getElementById('design').value;
    const additionalArea = parseFloat(document.getElementById('additionalArea').value) || 0;
    const materialDefect = document.getElementById('materialDefect').value;
    const orderVolume = parseInt(document.getElementById('orderVolume').value) || 0;
    const deliveryDistance = parseInt(document.getElementById('deliveryDistance').value) || 0;

    if (area <= 0 || !bannerType || !material || !type || !urgency || !season || !design || !materialDefect || orderVolume <= 0) {
        document.getElementById('result').innerText = "Пожалуйста, заполните все поля корректно (площадь и объем заказа должны быть больше 0).";
        document.getElementById('submit-order-btn').disabled = true;
        return;
    }

    let baseCost = 100;
    let bannerCost = 0;
    let materialCost = 0;
    let typeCost = 0;
    let urgencyCost = 0;
    let seasonCost = 0;
    let designCost = 0;
    let additionalAreaCost = additionalArea * 50;
    let materialDefectCost = 0;
    let volumeDiscount = orderVolume >= 10 ? 0.1 : 0;
    let deliveryCost = deliveryDistance * 10;

    switch (bannerType) {
        case "1": bannerCost = 500; break;
        case "2": bannerCost = 300; break;
        case "3": bannerCost = 200; break;
        case "4": bannerCost = 400; break;
    }

    switch (material) {
        case "1": materialCost = 50; break;
        case "2": materialCost = 100; break;
        case "3": materialCost = 70; break;
    }

    switch (type) {
        case "1": typeCost = 200; break;
        case "2": typeCost = 150; break;
        case "3": typeCost = 180; break;
    }

    urgencyCost = urgency === "2" ? 0.2 : urgency === "3" ? 0.4 : 0;
    seasonCost = season === "1" ? -0.1 : season === "3" ? 0.15 : 0;
    designCost = design === "2" ? 0.15 : design === "3" ? 0.3 : 0;
    materialDefectCost = materialDefect === "2" ? 0.1 : materialDefect === "3" ? 0.2 : 0;

    calculatedCost = ((baseCost + bannerCost + materialCost + typeCost) * area + additionalAreaCost) * 
        (1 + urgencyCost + seasonCost + designCost + materialDefectCost - volumeDiscount) + 
        deliveryCost;

    document.getElementById('result').innerText = `Стоимость: ${calculatedCost.toFixed(2)} руб.`;
    const isLoggedIn = document.getElementById('auth-links').innerHTML.includes('Личный кабинет');
    if (isLoggedIn) {
        document.getElementById('submit-order-btn').disabled = false;
    } else {
        document.getElementById('submit-order-btn').disabled = true;
        document.getElementById('result').innerText += '\nПожалуйста, авторизуйтесь, чтобы отправить заказ.';
    }
}

function submitOrder() {
    const area = parseFloat(document.getElementById('area').value) || 0;
    const bannerType = document.getElementById('bannerType').value;
    const material = document.getElementById('material').value;
    const type = document.getElementById('type').value;
    const urgency = document.getElementById('urgency').value;
    const season = document.getElementById('season').value;
    const design = document.getElementById('design').value;
    const additionalArea = parseFloat(document.getElementById('additionalArea').value) || 0;
    const materialDefect = document.getElementById('materialDefect').value;
    const orderVolume = parseInt(document.getElementById('orderVolume').value) || 0;
    const deliveryDistance = parseInt(document.getElementById('deliveryDistance').value) || 0;

    const orderData = {
        banner_type: bannerType,
        area: area,
        material: material,
        work_type: type,
        urgency: urgency,
        season: season,
        design_complexity: design,
        additional_area: additionalArea,
        material_defect: materialDefect,
        order_volume: orderVolume,
        delivery_distance: deliveryDistance,
        total_cost: calculatedCost
    };

    fetch('/submit-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('result').innerText = 'Заказ успешно отправлен! Номер заказа: ' + data.orderId;
            document.getElementById('submit-order-btn').disabled = true;
        } else {
            document.getElementById('result').innerText = 'Ошибка при отправке заказа: ' + data.message;
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        document.getElementById('result').innerText = 'Произошла ошибка при отправке заказа.';
    });
}

document.getElementById('calculate-cost-btn').addEventListener('click', calculateCost);
document.getElementById('submit-order-btn').addEventListener('click', submitOrder);

document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = document.getElementById('auth-links').innerHTML.includes('Личный кабинет');
    if (!isLoggedIn) {
        document.getElementById('submit-order-btn').style.display = 'none';
    }
});