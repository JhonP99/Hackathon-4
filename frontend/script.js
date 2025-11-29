// ================== CONFIGURACIÓN Y CONSTANTES ==================

const API_URL = 'http://localhost:3000/api';
const DEFAULT_SOLAR_HOURS = 5.0;

// ================== ESTADO DE APLICACIÓN ==================

const appState = {
    departamentos: [],
    tarifas: []
};

// ================== UTILIDADES GENERALES ==================

const formatMoney = (amount) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(amount);

const getElement = (id) => document.getElementById(id);

const setText = (id, text) => {
    const el = getElement(id);
    if (el) el.innerText = text;
};

const setHTML = (id, html) => {
    const el = getElement(id);
    if (el) el.innerHTML = html;
};

const safeParseFloat = (value, fallback = 0) => {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const safeParseInt = (value, fallback = 0) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

// ================== SERVICIOS DE DATOS (API) ==================

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error al llamar ${url}: HTTP ${response.status}`);
    }
    return response.json();
}

async function loadInitialData() {
    const [departamentos, tarifas] = await Promise.all([
        fetchJson(`${API_URL}/departamentos`),
        fetchJson(`${API_URL}/tarifas`)
    ]);

    appState.departamentos = departamentos;
    appState.tarifas = tarifas;
}

// ================== INICIALIZACIÓN ==================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    try {
        console.log('Iniciando sistema...');

        await loadInitialData();

        renderDepartamentos();
        renderEstratos();
        setupEventListeners();
        actualizarSugerencia();

        console.log('Sistema cargado correctamente.');
    } catch (error) {
        console.error('Error:', error);
        alert('No se pudo conectar con el servidor. Revisa que el Backend esté corriendo.');
    }
}

// ================== GESTIÓN DE UI ==================

function setupEventListeners() {
    const deptSelect = getElement('deptSelect');
    const consumoInput = getElement('consumoInput');
    const calidadSelect = getElement('calidadSelect');

    if (deptSelect) deptSelect.addEventListener('change', filtrarMunicipios);
    if (consumoInput) consumoInput.addEventListener('input', actualizarSugerencia);
    if (calidadSelect) calidadSelect.addEventListener('change', actualizarSugerencia);
}

function renderDepartamentos() {
    const select = getElement('deptSelect');
    if (!select) return;

    select.innerHTML = '<option value="" selected disabled>-- Seleccione Dpto --</option>';

    appState.departamentos.forEach((dpto) => {
        const option = document.createElement('option');
        option.value = dpto.departamento;
        option.innerText = dpto.departamento;
        option.setAttribute('data-mwh', dpto.promedio_mwh);
        select.appendChild(option);
    });
}

function renderEstratos() {
    const select = getElement('estratoSelect');
    if (!select) return;

    select.innerHTML = '';

    appState.tarifas.forEach((tarifa) => {
        const option = document.createElement('option');
        option.value = JSON.stringify(tarifa);
        option.innerText = `Estrato ${tarifa.estrato}`;
        select.appendChild(option);
    });

    select.addEventListener('change', updateEstratoInfo);

    if (appState.tarifas.length > 0) {
        select.selectedIndex = 0;
        updateEstratoInfo();
    }
}

// ================== LÓGICA DE UBICACIÓN ==================

async function filtrarMunicipios() {
    const dptoSelect = getElement('deptSelect');
    const muniSelect = getElement('muniSelect');

    if (!dptoSelect || !muniSelect) return;

    const dptoNombre = dptoSelect.value;
    muniSelect.innerHTML = '<option value="">Cargando...</option>';

    if (!dptoNombre) {
        muniSelect.innerHTML = '<option value="">Seleccione un departamento</option>';
        return;
    }

    try {
        const ciudades = await fetchJson(`${API_URL}/municipios/${dptoNombre}`);

        muniSelect.innerHTML = '<option value="">-- Seleccione Ciudad --</option>';
        ciudades.forEach((ciudad) => {
            const opt = document.createElement('option');
            opt.value = ciudad.municipio;
            opt.innerText = ciudad.municipio;
            muniSelect.appendChild(opt);
        });

        actualizarSugerencia();
    } catch (error) {
        console.error('Error municipios:', error);
        muniSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
}

function updateEstratoInfo() {
    const select = getElement('estratoSelect');
    if (!select || !select.value) return;

    const data = JSON.parse(select.value);

    setText('consumoPromedioHint', `Consumo promedio: ${data.consumo_promedio} kWh/mes`);
    setHTML(
        'precioKwhHint',
        `<i class="fa-solid fa-tag"></i> Tarifa: <strong>$${data.tarifa_kwh} /kWh</strong>`
    );
}

// ================== LÓGICA DE CÁLCULO ==================

function getSolarData() {
    const deptSelect = getElement('deptSelect');
    if (!deptSelect || deptSelect.selectedIndex <= 0) return DEFAULT_SOLAR_HOURS;

    const selectedOption = deptSelect.options[deptSelect.selectedIndex];
    const mwh = safeParseFloat(selectedOption.getAttribute('data-mwh'));

    return mwh ? mwh / 60 : DEFAULT_SOLAR_HOURS;
}

function actualizarSugerencia() {
    const consumo = safeParseFloat(getElement('consumoInput')?.value, 0);
    const horasSol = getSolarData();

    const produccionPanel = 0.55 * horasSol * 30 * 0.75;

    let panelesNecesarios = produccionPanel > 0
        ? Math.ceil(consumo / produccionPanel)
        : 1;

    if (panelesNecesarios < 1) panelesNecesarios = 1;

    const inputPaneles = getElement('numPaneles');
    if (inputPaneles) inputPaneles.value = panelesNecesarios;
}

window.cambiarPaneles = function cambiarPaneles(delta) {
    const input = getElement('numPaneles');
    if (!input) return;

    const valorActual = safeParseInt(input.value, 1);
    const nuevoValor = Math.max(valorActual + delta, 1);

    input.value = nuevoValor;
};

// ================== SIMULACIÓN Y RESULTADOS ==================

window.calcularSimulacion = function calcularSimulacion() {
    const consumo = safeParseFloat(getElement('consumoInput')?.value);
    const estratoJson = getElement('estratoSelect')?.value;
    const dept = getElement('deptSelect');
    const muni = getElement('muniSelect');

    const datosInvalidos =
        !estratoJson ||
        !consumo ||
        !dept ||
        !muni ||
        dept.selectedIndex <= 0 ||
        muni.selectedIndex <= 0;

    if (datosInvalidos) {
        alert('Por favor verifica los datos ingresados.');
        return;
    }

    const horasSol = getSolarData();
    const paneles = safeParseInt(getElement('numPaneles')?.value, 0);
    const eficiencia = safeParseFloat(getElement('calidadSelect')?.value, 0.18);
    const tarifa = JSON.parse(estratoJson).tarifa_kwh;

    const generacion =
        paneles * 0.55 * horasSol * 30 * (0.75 + (eficiencia - 0.18));
    const costoActual = consumo * tarifa;

    const costoFijo = Math.max(costoActual * 0.15, 20000);
    let ahorro = Math.min(generacion * tarifa, costoActual - costoFijo);
    if (ahorro < 0) ahorro = 0;

    const reduccionPorc = (ahorro / costoActual) * 100;

    setText('resEnergia', `${Math.round(generacion)} kWh/mes`);
    setText('resDinero', formatMoney(ahorro));
    setText('resPorcentaje', `${reduccionPorc.toFixed(1)}%`);

    const colorPorcentaje = reduccionPorc > 50 ? '#2ecc71' : '#f1c40f';
    const resPorcentajeEl = getElement('resPorcentaje');
    if (resPorcentajeEl) resPorcentajeEl.style.color = colorPorcentaje;

    updateFooterResults(consumo, tarifa, horasSol);
    updateChart(costoActual, costoActual - ahorro, ahorro);
    toggleResultsVisibility(true);
};

function updateFooterResults(consumo, tarifa, sol) {
    setText('infoConsumo', `${consumo} kWh`);
    setText('infoTarifa', formatMoney(tarifa));
    setText('infoSol', `${sol.toFixed(1)} h/día`);
}

function updateChart(actual, nuevo, ahorro) {
    setText('labelCostoActual', formatMoney(actual));
    setText('labelCostoPaneles', formatMoney(nuevo));
    setText('labelAhorro', formatMoney(ahorro));

    const base = actual > 0 ? actual : 1;
    const pctNuevo = (nuevo / base) * 100;
    const pctAhorro = (ahorro / base) * 100;

    const barNew = getElement('barNewHeight');
    const barSave = getElement('barSaveHeight');

    if (barNew) barNew.style.height = `${pctNuevo}%`;
    if (barSave) barSave.style.height = `${pctAhorro}%`;
}

// ================== ESTADO INICIAL / RESET ==================

function toggleResultsVisibility(showResults) {
    const estadoInicial = getElement('estadoInicial');
    const resBox = getElement('resultadosBox');

    if (!estadoInicial || !resBox) return;

    if (showResults) {
        estadoInicial.classList.add('hidden');
        resBox.classList.remove('hidden');
        resBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        resBox.classList.add('hidden');
        estadoInicial.classList.remove('hidden');
    }
}

window.resetearCalculadora = function resetearCalculadora() {
    toggleResultsVisibility(false);

    const form = getElement('formCalc');
    if (form) form.reset();

    setText('resEnergia', '0 kWh/mes');
    setText('resDinero', '$0');
    setText('resPorcentaje', '0%');

    const barNew = getElement('barNewHeight');
    const barSave = getElement('barSaveHeight');
    if (barNew) barNew.style.height = '0%';
    if (barSave) barSave.style.height = '0%';

    actualizarSugerencia();

    window.scrollTo({ top: 0, behavior: 'smooth' });
};
