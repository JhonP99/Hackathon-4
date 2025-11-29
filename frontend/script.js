/**
 * ============================================================================
 * CALCULADORA SOLAR - LÓGICA DEL CLIENTE
 * ============================================================================
 * Autor: [Tu Nombre / Equipo]
 * Descripción: Gestiona la carga de datos regionales, cálculo fotovoltaico
 * y renderizado de gráficos de ahorro.
 */

// --- CONSTANTES Y CONFIGURACIÓN ---
const API_URL = 'http://localhost:3000/api';
const DEFAULT_SOLAR_HOURS = 5.0; // Promedio Colombia por defecto

// --- VARIABLES GLOBALES ---
let departamentosData = []; 
let tarifasDB = [];

// --- HELPERS (Funciones de Ayuda Reutilizables) ---

/**
 * Formatea un número a formato moneda Colombiana (COP) sin decimales.
 */
const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
    }).format(amount);
};

/**
 * Obtiene las Horas Sol Pico (HSP) de la región seleccionada.
 * Responde a la necesidad de variar el cálculo según el clima de la región.
 */
const getSolarData = () => {
    const deptSelect = document.getElementById("deptSelect");
    
    // Si no hay selección válida, devolvemos el promedio nacional
    if (!deptSelect || deptSelect.selectedIndex <= 0) return DEFAULT_SOLAR_HOURS;

    // Obtenemos el atributo oculto guardado en el <option>
    const mwh = parseFloat(deptSelect.options[deptSelect.selectedIndex].getAttribute('data-mwh'));
    
    // Conversión: MWh mensual industrial -> Horas Sol Pico diarias (Aprox / 60)
    return mwh ? (mwh / 60) : DEFAULT_SOLAR_HOURS;
};


/* ======================================================
   1. INICIALIZACIÓN Y CARGA DE DATOS
   ====================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Iniciando sistema...");
    await initApp();
});

async function initApp() {
    try {
        // Carga paralela de datos para mayor velocidad
        const [resDeptos, resTarifas] = await Promise.all([
            fetch(`${API_URL}/departamentos`),
            fetch(`${API_URL}/tarifas`)
        ]);

        if (!resDeptos.ok || !resTarifas.ok) throw new Error("Error de comunicación con API");

        departamentosData = await resDeptos.json();
        tarifasDB = await resTarifas.json();

        console.log("✅ Datos regionales y tarifas cargados.");

        // Inicializar UI
        renderDepartamentos();
        renderEstratos();
        
        // Ejecutar primera sugerencia
        actualizarSugerencia(); 

    } catch (error) {
        console.error("❌ Error Crítico:", error);
        alert("Error de conexión. Verifique que el servidor Backend esté activo.");
    }
}


/* ======================================================
   2. GESTIÓN DE LA INTERFAZ (UI)
   ====================================================== */

function renderDepartamentos() {
    const select = document.getElementById("deptSelect");
    select.innerHTML = '<option value="">-- Seleccione Dpto --</option>';
    
    departamentosData.forEach(d => {
        const option = document.createElement("option");
        option.value = d.departamento;
        option.innerText = d.departamento;
        // IMPORTANTE: Aquí guardamos el dato climático específico de la región
        option.setAttribute('data-mwh', d.promedio_mwh);
        select.appendChild(option);
    });
}

function renderEstratos() {
    const select = document.getElementById("estratoSelect");
    select.innerHTML = ""; 

    tarifasDB.forEach(t => {
        const option = document.createElement("option");
        option.value = JSON.stringify(t); // Guardamos todo el objeto tarifa
        option.innerText = `Estrato ${t.estrato}`;
        select.appendChild(option);
    });

    // Listener para actualizar info al cambiar selección
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
        muniSelect.innerHTML = '<option value="">-- Seleccione Dpto --</option>';
        return;
    }

    try {
        const resp = await fetch(`${API_URL}/municipios/${dptoNombre}`);
        const ciudades = await resp.json();
        
        muniSelect.innerHTML = '<option value="">-- Seleccione Ciudad --</option>';
        ciudades.forEach(c => {
            muniSelect.innerHTML += `<option value="${c.municipio}">${c.municipio}</option>`;
        });
        
        // Recalcular sugerencia ya que cambió la región (y por ende el sol)
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
    
    // Actualizar textos de ayuda en el DOM
    document.getElementById("consumoPromedioHint").innerText = `Promedio hogar similar: ${d.consumo_promedio} kWh/mes`;
    
    const precioHint = document.getElementById("precioKwhHint");
    if(precioHint) {
        precioHint.innerHTML = `<i class="fa-solid fa-tag"></i> Tarifa estimada: <strong>${formatMoney(d.tarifa_kwh)} /kWh</strong>`;
    }
}


/* ======================================================
   3. LÓGICA DE NEGOCIO (Sugerencias y Cálculos)
   ====================================================== */

/**
 * Calcula automáticamente cuántos paneles necesita el usuario
 * basado en su consumo y la radiación de su región.
 */
function actualizarSugerencia() {
    const consumo = parseFloat(document.getElementById("consumoInput").value) || 0;
    const calidad = parseFloat(document.getElementById("calidadSelect").value) || 0.25;
    
    // Obtenemos sol real de la zona usando el Helper
    const horasSol = getSolarData();

    // Fórmula: PotenciaPanel(0.55) * HorasSol * 30dias * EficienciaGlobal(0.75)
    const produccionPorPanel = 0.55 * horasSol * 30 * 0.75; 
    
    let panelesSugeridos = Math.ceil(consumo / produccionPorPanel);
    if(panelesSugeridos < 1) panelesSugeridos = 1;

    // Actualizar UI
    document.getElementById("numPaneles").value = panelesSugeridos;
    
    const explicacion = document.getElementById("explicacionPaneles");
    if(explicacion) {
        explicacion.innerText = `Sugerencia basada en radiación de tu zona: ${panelesSugeridos} paneles.`;
        explicacion.style.color = "#2980b9";
    }
}

/**
 * Control manual de los botones + y -
 */
function cambiarPaneles(n) {
    const input = document.getElementById("numPaneles");
    let val = parseInt(input.value) + n;
    
    if(val >= 1) {
        input.value = val;
        // Feedback visual de cambio manual
        const explicacion = document.getElementById("explicacionPaneles");
        if(explicacion) {
            explicacion.innerText = "Modificado manualmente.";
            explicacion.style.color = "#e67e22";
        }
    }
}


/* ======================================================
   4. SIMULACIÓN FINANCIERA (Core)
   ====================================================== */

function calcularSimulacion() {
    // 1. Validaciones
    const deptSelect = document.getElementById("deptSelect");
    if(deptSelect.selectedIndex <= 0) return alert("Por favor selecciona un departamento");
    
    const consumo = parseFloat(document.getElementById("consumoInput").value);
    const estratoRaw = document.getElementById("estratoSelect").value;
    
    if(!estratoRaw || !consumo) return alert("Por favor completa todos los campos.");

    // 2. Obtención de Datos
    const horasSol = getSolarData(); // Dato crítico regional
    const paneles = parseInt(document.getElementById("numPaneles").value);
    const eficienciaPanel = parseFloat(document.getElementById("calidadSelect").value);
    
    const tData = JSON.parse(estratoRaw);
    const tarifa = tData.tarifa_kwh;

    // 3. Cálculos Matemáticos Avanzados
    
    // A. Generación Estimada:
    // Factor 0.75 base + bonus por calidad del panel seleccionado
    const factorRendimiento = 0.75 + (eficienciaPanel - 0.18); 
    const generacionMensual = paneles * 0.55 * horasSol * 30 * factorRendimiento;

    // B. Costos Financieros:
    const costoFacturaActual = consumo * tarifa;
    
    // C. Lógica de "Factura Realista":
    // Nunca es cero. Mínimo impuesto alumbrado + comercialización (aprox 15% o 25k COP)
    const costoFijoObligatorio = Math.max(costoFacturaActual * 0.15, 25000); 
    const maximoAhorroPosible = costoFacturaActual - costoFijoObligatorio;

    // D. Ahorro Bruto:
    let ahorroCalculado = generacionMensual * tarifa;

    // E. Aplicar Topes (No puedes ahorrar más de lo permitido legalmente)
    if (ahorroCalculado > maximoAhorroPosible) {
        ahorroCalculado = maximoAhorroPosible;
    }

    const costoConPaneles = costoFacturaActual - ahorroCalculado;
    const porcentajeReduccion = (ahorroCalculado / costoFacturaActual) * 100;

    // 4. Renderizado de Resultados
    
    // KPIs Superiores
    document.getElementById("resEnergia").innerText = Math.round(generacionMensual) + " kWh/mes";
    document.getElementById("resDinero").innerText = formatMoney(ahorroCalculado);
    document.getElementById("resPorcentaje").innerText = porcentajeReduccion.toFixed(1) + "%";
    
    // Color dinámico del porcentaje
    const colorPorc = porcentajeReduccion > 50 ? "#27ae60" : "#e67e22";
    document.getElementById("resPorcentaje").style.color = colorPorc;

    // Gráfico de Barras (Alturas CSS Dinámicas)
    updateChart(costoFacturaActual, costoConPaneles, ahorroCalculado);

    // Información al Pie
    document.getElementById("infoConsumo").innerText = consumo + " kWh";
    document.getElementById("infoTarifa").innerText = formatMoney(tarifa);
    document.getElementById("infoSol").innerText = horasSol.toFixed(1) + " h/día";

    // Transición Visual
    showResults();
}

/**
 * Helper para actualizar las barras del gráfico CSS
 */
function updateChart(actual, conPaneles, ahorro) {
    // Texto
    document.getElementById("labelCostoActual").innerText = formatMoney(actual);
    document.getElementById("labelCostoPaneles").innerText = formatMoney(conPaneles);
    document.getElementById("labelAhorro").innerText = formatMoney(ahorro);

    // Alturas (Mínimo visual 5% para que no desaparezca la barra)
    let hPaneles = (conPaneles / actual) * 100;
    if (hPaneles < 5) hPaneles = 5;
    
    let hAhorro = (ahorro / actual) * 100;

    document.getElementById("barNewHeight").style.height = `${hPaneles}%`; 
    document.getElementById("barSaveHeight").style.height = `${hAhorro}%`; 
}

function showResults() {
    document.getElementById("estadoInicial").classList.add("hidden");
    const resBox = document.getElementById("resultadosBox");
    resBox.classList.remove("hidden");
    resBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetearCalculadora() {
    document.getElementById("resultadosBox").classList.add("hidden");
    document.getElementById("estadoInicial").classList.remove("hidden");
    document.querySelector('.container').scrollIntoView({ behavior: 'smooth' });
}