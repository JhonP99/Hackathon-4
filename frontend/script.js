const API_URL = 'http://localhost:3000/api';
const DEFAULT_SOLAR_HOURS = 5.0; // Promedio Colombia

class SolarCalculatorApp {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.departamentosData = [];
        this.tarifasDB = [];

        // Referencias DOM
        this.$deptSelect = document.getElementById('deptSelect');
        this.$muniSelect = document.getElementById('muniSelect');
        this.$estratoSelect = document.getElementById('estratoSelect');
        this.$consumoInput = document.getElementById('consumoInput');
        this.$calidadSelect = document.getElementById('calidadSelect');
        this.$numPaneles = document.getElementById('numPaneles');
        this.$precioKwhHint = document.getElementById('precioKwhHint');
        this.$consumoPromedioHint = document.getElementById('consumoPromedioHint');
        this.$explicacionPaneles = document.getElementById('explicacionPaneles');

        this.$resEnergia = document.getElementById('resEnergia');
        this.$resDinero = document.getElementById('resDinero');
        this.$resPorcentaje = document.getElementById('resPorcentaje');

        this.$labelCostoActual = document.getElementById('labelCostoActual');
        this.$labelCostoPaneles = document.getElementById('labelCostoPaneles');
        this.$labelAhorro = document.getElementById('labelAhorro');
        this.$barNewHeight = document.getElementById('barNewHeight');
        this.$barSaveHeight = document.getElementById('barSaveHeight');

        this.$infoConsumo = document.getElementById('infoConsumo');
        this.$infoTarifa = document.getElementById('infoTarifa');
        this.$infoSol = document.getElementById('infoSol');

        this.$estadoInicial = document.getElementById('estadoInicial');
        this.$resultadosBox = document.getElementById('resultadosBox');
        this.$container = document.querySelector('.container');

        this.$btnCalc = document.getElementById('btnCalc');
        this.$btnPanelMinus = document.getElementById('btnPanelMinus');
        this.$btnPanelPlus = document.getElementById('btnPanelPlus');
        this.$btnReload = document.getElementById('btnReload');
    }

    // ---------- Inicialización ----------
    async init() {
        try {
            console.log('🚀 Iniciando sistema...');
            await this.loadInitialData();
            this.initUIEvents();
            this.actualizarSugerencia();
        } catch (error) {
            console.error('❌ Error Crítico:', error);
            alert('Error de conexión. Verifique que el servidor Backend esté activo.');
        }
    }

    async loadInitialData() {
        const [departamentos, tarifas] = await Promise.all([
            this.fetchJson(`${this.apiUrl}/departamentos`),
            this.fetchJson(`${this.apiUrl}/tarifas`)
        ]);

        this.departamentosData = departamentos;
        this.tarifasDB = tarifas;

        this.renderDepartamentos();
        this.renderEstratos();

        console.log('✅ Datos regionales y tarifas cargados.');
    }

    initUIEvents() {
        if (this.$deptSelect) {
            this.$deptSelect.addEventListener('change', () => this.filtrarMunicipios());
        }

        if (this.$estratoSelect) {
            this.$estratoSelect.addEventListener('change', () => this.updateEstratoInfo());
        }

        if (this.$consumoInput) {
            this.$consumoInput.addEventListener('input', () => this.actualizarSugerencia());
        }

        if (this.$calidadSelect) {
            this.$calidadSelect.addEventListener('change', () => this.actualizarSugerencia());
        }

        if (this.$btnCalc) {
            this.$btnCalc.addEventListener('click', () => this.calcularSimulacion());
        }

        if (this.$btnPanelMinus) {
            this.$btnPanelMinus.addEventListener('click', () => this.cambiarPaneles(-1));
        }

        if (this.$btnPanelPlus) {
            this.$btnPanelPlus.addEventListener('click', () => this.cambiarPaneles(1));
        }

        if (this.$btnReload) {
            this.$btnReload.addEventListener('click', () => this.resetearCalculadora());
        }
    }

    // ---------- Helpers ----------
    async fetchJson(url) {
        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error(`Error HTTP ${resp.status} al llamar ${url}`);
        }
        return resp.json();
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(amount);
    }

    getSolarData() {
        if (!this.$deptSelect || this.$deptSelect.selectedIndex <= 0) {
            return DEFAULT_SOLAR_HOURS;
        }

        const option = this.$deptSelect.options[this.$deptSelect.selectedIndex];
        const mwh = parseFloat(option.getAttribute('data-mwh'));
        return mwh ? (mwh / 60) : DEFAULT_SOLAR_HOURS;
    }

    // ---------- Render de UI ----------
    renderDepartamentos() {
        if (!this.$deptSelect) return;

        this.$deptSelect.innerHTML = '<option value="">-- Seleccione Dpto --</option>';

        this.departamentosData.forEach(d => {
            const option = document.createElement('option');
            option.value = d.departamento;
            option.textContent = d.departamento;
            option.setAttribute('data-mwh', d.promedio_mwh);
            this.$deptSelect.appendChild(option);
        });
    }

    renderEstratos() {
        if (!this.$estratoSelect) return;

        this.$estratoSelect.innerHTML = '';

        this.tarifasDB.forEach(t => {
            const option = document.createElement('option');
            option.value = JSON.stringify(t);
            option.textContent = `Estrato ${t.estrato}`;
            this.$estratoSelect.appendChild(option);
        });

        if (this.tarifasDB.length > 0) {
            this.$estratoSelect.selectedIndex = 0;
            this.updateEstratoInfo();
        }
    }

    async filtrarMunicipios() {
        if (!this.$deptSelect || !this.$muniSelect) return;

        const dptoNombre = this.$deptSelect.value;
        this.$muniSelect.innerHTML = '<option value="">Cargando...</option>';

        if (!dptoNombre) {
            this.$muniSelect.innerHTML = '<option value="">-- Seleccione Dpto --</option>';
            return;
        }

        try {
            const ciudades = await this.fetchJson(`${this.apiUrl}/municipios/${encodeURIComponent(dptoNombre)}`);
            this.$muniSelect.innerHTML = '<option value="">-- Seleccione Ciudad --</option>';

            ciudades.forEach(c => {
                const option = document.createElement('option');
                option.value = c.municipio;
                option.textContent = c.municipio;
                this.$muniSelect.appendChild(option);
            });

            this.actualizarSugerencia();
        } catch (error) {
            console.error('Error municipios:', error);
            this.$muniSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    updateEstratoInfo() {
        if (!this.$estratoSelect || !this.$estratoSelect.value) return;

        const data = JSON.parse(this.$estratoSelect.value);

        if (this.$consumoPromedioHint) {
            this.$consumoPromedioHint.textContent =
                `Promedio hogar similar: ${data.consumo_promedio} kWh/mes`;
        }

        if (this.$precioKwhHint) {
            this.$precioKwhHint.innerHTML =
                `<i class="fa-solid fa-tag"></i> Tarifa estimada: <strong>${this.formatMoney(data.tarifa_kwh)} /kWh</strong>`;
        }
    }

    // ---------- Lógica de negocio ----------
    actualizarSugerencia() {
        const consumo = parseFloat(this.$consumoInput?.value) || 0;
        const calidad = parseFloat(this.$calidadSelect?.value) || 0.25;
        const horasSol = this.getSolarData();

        const produccionPorPanel = 0.55 * horasSol * 30 * 0.75;
        let panelesSugeridos = this.getSuggestedPanels(consumo, produccionPorPanel);

        if (this.$numPaneles) {
            this.$numPaneles.value = panelesSugeridos;
        }

        if (this.$explicacionPaneles) {
            this.$explicacionPaneles.textContent =
                `Sugerencia basada en radiación de tu zona: ${panelesSugeridos} paneles.`;
            this.$explicacionPaneles.style.color = '#2980b9';
        }
    }

    getSuggestedPanels(consumo, produccionPorPanel) {
        if (produccionPorPanel <= 0) return 1;
        let paneles = Math.ceil(consumo / produccionPorPanel);
        return paneles < 1 ? 1 : paneles;
    }

    cambiarPaneles(delta) {
        if (!this.$numPaneles) return;

        const current = parseInt(this.$numPaneles.value) || 0;
        const nuevo = current + delta;

        if (nuevo >= 1) {
            this.$numPaneles.value = nuevo;
            if (this.$explicacionPaneles) {
                this.$explicacionPaneles.textContent = 'Modificado manualmente.';
                this.$explicacionPaneles.style.color = '#e67e22';
            }
        }
    }

    calcularSimulacion() {
        if (!this.$deptSelect || this.$deptSelect.selectedIndex <= 0) {
            alert('Por favor selecciona un departamento');
            return;
        }

        const consumo = parseFloat(this.$consumoInput?.value);
        const estratoRaw = this.$estratoSelect?.value;

        if (!estratoRaw || !consumo) {
            alert('Por favor completa todos los campos.');
            return;
        }

        const horasSol = this.getSolarData();
        const paneles = parseInt(this.$numPaneles?.value) || 0;
        const eficienciaPanel = parseFloat(this.$calidadSelect?.value) || 0.25;

        const tData = JSON.parse(estratoRaw);
        const tarifa = tData.tarifa_kwh;

        const simulacion = this.calcularEscenario(consumo, paneles, eficienciaPanel, tarifa, horasSol);

        this.renderResultados(simulacion, consumo, tarifa, horasSol);
        this.showResults();
    }

    calcularEscenario(consumo, paneles, eficienciaPanel, tarifa, horasSol) {
        const factorRendimiento = 0.75 + (eficienciaPanel - 0.18);
        const generacionMensual = paneles * 0.55 * horasSol * 30 * factorRendimiento;

        const costoFacturaActual = consumo * tarifa;

        const costoFijoObligatorio = Math.max(costoFacturaActual * 0.15, 25000);
        const maximoAhorroPosible = costoFacturaActual - costoFijoObligatorio;

        let ahorroCalculado = generacionMensual * tarifa;
        if (ahorroCalculado > maximoAhorroPosible) {
            ahorroCalculado = maximoAhorroPosible;
        }

        const costoConPaneles = costoFacturaActual - ahorroCalculado;
        const porcentajeReduccion = (ahorroCalculado / costoFacturaActual) * 100;

        return {
            generacionMensual,
            costoFacturaActual,
            costoConPaneles,
            ahorroCalculado,
            porcentajeReduccion
        };
    }

    renderResultados(sim, consumo, tarifa, horasSol) {
        if (this.$resEnergia) {
            this.$resEnergia.textContent = `${Math.round(sim.generacionMensual)} kWh/mes`;
        }
        if (this.$resDinero) {
            this.$resDinero.textContent = this.formatMoney(sim.ahorroCalculado);
        }
        if (this.$resPorcentaje) {
            this.$resPorcentaje.textContent = `${sim.porcentajeReduccion.toFixed(1)}%`;
            const colorPorc = sim.porcentajeReduccion > 50 ? '#27ae60' : '#e67e22';
            this.$resPorcentaje.style.color = colorPorc;
        }

        this.updateChart(sim.costoFacturaActual, sim.costoConPaneles, sim.ahorroCalculado);

        if (this.$infoConsumo) {
            this.$infoConsumo.textContent = `${consumo} kWh`;
        }
        if (this.$infoTarifa) {
            this.$infoTarifa.textContent = this.formatMoney(tarifa);
        }
        if (this.$infoSol) {
            this.$infoSol.textContent = `${horasSol.toFixed(1)} h/día`;
        }
    }

    updateChart(actual, conPaneles, ahorro) {
        if (this.$labelCostoActual) {
            this.$labelCostoActual.textContent = this.formatMoney(actual);
        }
        if (this.$labelCostoPaneles) {
            this.$labelCostoPaneles.textContent = this.formatMoney(conPaneles);
        }
        if (this.$labelAhorro) {
            this.$labelAhorro.textContent = this.formatMoney(ahorro);
        }

        const safeActual = actual || 1;

        let hPaneles = (conPaneles / safeActual) * 100;
        if (hPaneles < 5) hPaneles = 5;

        let hAhorro = (ahorro / safeActual) * 100;
        if (hAhorro < 0) hAhorro = 0;

        if (this.$barNewHeight) {
            this.$barNewHeight.style.height = `${hPaneles}%`;
        }
        if (this.$barSaveHeight) {
            this.$barSaveHeight.style.height = `${hAhorro}%`;
        }
    }

    showResults() {
        if (this.$estadoInicial) {
            this.$estadoInicial.classList.add('hidden');
        }
        if (this.$resultadosBox) {
            this.$resultadosBox.classList.remove('hidden');
            this.$resultadosBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    resetearCalculadora() {
        if (this.$resultadosBox) {
            this.$resultadosBox.classList.add('hidden');
        }
        if (this.$estadoInicial) {
            this.$estadoInicial.classList.remove('hidden');
        }
        if (this.$container) {
            this.$container.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    const app = new SolarCalculatorApp(API_URL);
    app.init();
});
