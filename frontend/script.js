const API_URL = 'http://localhost:3000/api';
const DEFAULT_SOLAR_HOURS = 5.0; // Valor de respaldo

// Variables globales para datos
let departamentosData = []; 
let tarifasDB = [];

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

async function initApp() {
    try {
        console.log("Iniciando sistema...");

        const [resDeptos, resTarifas] = await Promise.all([
            fetch(`${API_URL}/departamentos`),
            fetch(`${API_URL}/tarifas`)
        ]);

        if (!resDeptos.ok || !resTarifas.ok) throw new Error("Fallo en API");

        departamentosData = await resDeptos.json();
        tarifasDB = await resTarifas.json();

        // Renderizado inicial
        renderDepartamentos();
        renderEstratos();
        setupEventListeners();

        // Primera actualización visual
        actualizarSugerencia();

        console.log("Sistema cargado correctamente.");

    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo conectar con el servidor. Revisa que el Backend esté corriendo.");
    }
}

function setupEventListeners() {
    document.getElementById("deptSelect").addEventListener("change", filtrarMunicipios);
    document.getElementById("consumoInput").addEventListener("input", actualizarSugerencia);
    document.getElementById("calidadSelect").addEventListener("change", actualizarSugerencia);
}

// 2. GESTIÓN DE LA UI

function renderDepartamentos() {
    const select = document.getElementById("deptSelect");
    select.innerHTML = '<option value="" selected disabled>-- Seleccione Dpto --</option>';
    
    departamentosData.forEach(d => {
        const option = document.createElement("option");
        option.value = d.departamento;
        option.innerText = d.departamento;
        // Guardamos dato climático en el HTML
        option.setAttribute('data-mwh', d.promedio_mwh);
        select.appendChild(option);
    });
}

function renderEstratos() {
    const select = document.getElementById("estratoSelect");
    select.innerHTML = ""; 

    tarifasDB.forEach(t => {
        const option = document.createElement("option");
        option.value = JSON.stringify(t); 
        option.innerText = `Estrato ${t.estrato}`;
        select.appendChild(option);
    });

    select.addEventListener("change", updateEstratoInfo);
    
    // Seleccionar el primero por defecto
    if(tarifasDB.length > 0) {
        select.selectedIndex = 0; 
        updateEstratoInfo();
    }
}

async function filtrarMunicipios() {
    const dptoNombre = document.getElementById("deptSelect").value;
    const muniSelect = document.getElementById("muniSelect");
    
    muniSelect.innerHTML = '<option value="">Cargando...</option>';
    
    if (!dptoNombre) {
        muniSelect.innerHTML = '<option value="">Seleccione un departamento</option>';
        return;
    }

    try {
        const resp = await fetch(`${API_URL}/municipios/${dptoNombre}`);
        const ciudades = await resp.json();
        
        muniSelect.innerHTML = '<option value="">-- Seleccione Ciudad --</option>';
        ciudades.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.municipio;
            opt.innerText = c.municipio;
            muniSelect.appendChild(opt);
        });
        
        actualizarSugerencia(); 

    } catch (e) {
        console.error("Error municipios:", e);
        muniSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
}

function updateEstratoInfo() {
    const select = document.getElementById("estratoSelect");
    if(!select.value) return;
    
    const d = JSON.parse(select.value);
    
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = text; 
    };

    setText("consumoPromedioHint", `Consumo promedio: ${d.consumo_promedio} kWh/mes`);
    setText("precioKwhHint", `<i class="fa-solid fa-tag"></i> Tarifa: <strong>$${d.tarifa_kwh} /kWh</strong>`);
}

// 3. LÓGICA DE CÁLCULO

const getSolarData = () => {
    const deptSelect = document.getElementById("deptSelect");
    if (!deptSelect || deptSelect.selectedIndex <= 0) return DEFAULT_SOLAR_HOURS;

    const mwh = parseFloat(deptSelect.options[deptSelect.selectedIndex].getAttribute('data-mwh'));
    return mwh ? (mwh / 60) : DEFAULT_SOLAR_HOURS;
};

function actualizarSugerencia() {
    const consumo = parseFloat(document.getElementById("consumoInput").value) || 0;
    const horasSol = getSolarData();
    
    const produccionPanel = 0.55 * horasSol * 30 * 0.75; 
    
    let necesarios = Math.ceil(consumo / produccionPanel);
    if(necesarios < 1) necesarios = 1;

    const inputPaneles = document.getElementById("numPaneles");
    if(inputPaneles) inputPaneles.value = necesarios;
}

window.cambiarPaneles = function(delta) {
    const input = document.getElementById("numPaneles");
    let val = parseInt(input.value) + delta;
    if(val < 1) val = 1;
    input.value = val;
};

// 4. SIMULACIÓN Y GRÁFICOS

window.calcularSimulacion = function() {
    // A. Validar
    const consumo = parseFloat(document.getElementById("consumoInput").value);
    const estratoJson = document.getElementById("estratoSelect").value;
    const dept = document.getElementById("deptSelect");
    const muni = document.getElementById("muniSelect");
    if(!estratoJson || !consumo || dept.selectedIndex <= 0 || muni.selectedIndex <= 0) {
        alert("Por favor verifica los datos ingresados.");
        return;
    }

    // B. Calcular
    const horasSol = getSolarData();
    const paneles = parseInt(document.getElementById("numPaneles").value);
    const eficiencia = parseFloat(document.getElementById("calidadSelect").value);
    const tarifa = JSON.parse(estratoJson).tarifa_kwh;

    const generacion = paneles * 0.55 * horasSol * 30 * (0.75 + (eficiencia - 0.18));
    const costoActual = consumo * tarifa;
    
    const costoFijo = Math.max(costoActual * 0.15, 20000); 
    let ahorro = Math.min(generacion * tarifa, costoActual - costoFijo);

    if (ahorro < 0) ahorro = 0;
    
    const reduccionPorc = (ahorro / costoActual) * 100;

    // C. Mostrar Resultados Textuales
    document.getElementById("resEnergia").innerText = Math.round(generacion) + " kWh/mes";
    document.getElementById("resDinero").innerText = formatMoney(ahorro);
    document.getElementById("resPorcentaje").innerText = reduccionPorc.toFixed(1) + "%";
    
    // Color del porcentaje
    const color = reduccionPorc > 50 ? "#2ecc71" : "#f1c40f";
    document.getElementById("resPorcentaje").style.color = color;

    // D. Actualizar Footer
    updateFooterResults(consumo, tarifa, horasSol);

    // E. Actualizar Gráfico Visual
    updateChart(costoActual, costoActual - ahorro, ahorro);

    // F. Mostrar Sección
    const estadoInicial = document.getElementById("estadoInicial");
    const resBox = document.getElementById("resultadosBox");

    if (estadoInicial) {
        estadoInicial.classList.add("hidden");
    }
    if (resBox) {
        resBox.classList.remove("hidden");
        resBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// Actualiza los datos informativos al pie
function updateFooterResults(consumo, tarifa, sol) {
    const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    setText("infoConsumo", `${consumo} kWh`);
    setText("infoTarifa", formatMoney(tarifa));
    setText("infoSol", `${sol.toFixed(1)} h/día`);
}

/**
 * ACTUALIZA LAS BARRAS DEL GRÁFICO
 * Calcula la altura porcentual para la animación CSS
 */
function updateChart(actual, nuevo, ahorro) {
    // 1. Actualizar etiquetas de dinero
    document.getElementById("labelCostoActual").innerText = formatMoney(actual);
    document.getElementById("labelCostoPaneles").innerText = formatMoney(nuevo);
    document.getElementById("labelAhorro").innerText = formatMoney(ahorro);

    // 2. Calcular Alturas relativas (La barra roja "actual" es la referencia 100%)
    // Si 'actual' es 0, evitamos división por cero.
    const base = actual > 0 ? actual : 1;
    
    // Calculamos porcentaje simple
    let pctNuevo = (nuevo / base) * 100;
    let pctAhorro = (ahorro / base) * 100;

    // 3. Aplicar estilos
    // TODO:Nota: La barra roja es estática visualmente, las otras se comparan contra ella.
    
    // Barra Nueva
    const barNew = document.getElementById("barNewHeight");
    if(barNew) barNew.style.height = `${pctNuevo}%`;

    // Barra Ahorro
    const barSave = document.getElementById("barSaveHeight");
    if(barSave) barSave.style.height = `${pctAhorro}%`;
}


 // Limpia formulario, resetea textos y baja las gráficas a 0.
window.resetearCalculadora = function() {
    // 1. Ocultar caja de resultados y mostrar estado inicial
    const resBox = document.getElementById("resultadosBox");
    const estadoInicial = document.getElementById("estadoInicial");

    if (resBox) resBox.classList.add("hidden");
    if (estadoInicial) estadoInicial.classList.remove("hidden");

    // 2. Resetear Formulario HTML
    document.getElementById("formCalc").reset();

    // 3. Limpiar Textos de Resultados (Visual)
    document.getElementById("resEnergia").innerText = "0 kWh/mes";
    document.getElementById("resDinero").innerText = "$0";
    document.getElementById("resPorcentaje").innerText = "0%";

    // 4. Bajar gráficas a cero
    const barNew = document.getElementById("barNewHeight");
    const barSave = document.getElementById("barSaveHeight");
    if (barNew) barNew.style.height = "0%";
    if (barSave) barSave.style.height = "0%";

    // 5. Recalcular sugerencia base
    actualizarSugerencia();

    // 6. Volver arriba suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
};


// Formato Moneda COP
const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
    }).format(amount);
};