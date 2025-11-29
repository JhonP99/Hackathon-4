# Calculadora Solar Pro - Simulador Energético del Caribe

![Estado](https://img.shields.io/badge/Estado-Finalizado-success)
![Versión](https://img.shields.io/badge/Versión-1.0.0-blue)
![Stack](https://img.shields.io/badge/Tech-NodeJS_PostgreSQL-orange)

## Descripción

**Calculadora Solar Pro** es una herramienta tecnológica desarrollada para el **Reto: Simulador de Costos Energéticos para Hogares Vulnerables**.

Esta aplicación web permite a las familias de la región Caribe simular con precisión cuánto dinero ahorrarían instalando paneles solares. A diferencia de calculadoras genéricas, este sistema utiliza datos reales de radiación por departamento, tarifas oficiales por estrato y lógica de **venta de excedentes de energía**, demostrando que la energía solar es rentable incluso para consumos bajos.

---

## Características Clave

1.  **Backend:**
    *   El sistema cuenta con una arquitectura inteligente capaz de conectarse **PostgreSQL** alojado en supabase.

2.  **Simulación Financiera Realista:**
    *   **Costo Fijo de Red:** Incluye impuestos y comercialización base (nunca promete una factura de $0).
    *   **Venta de Excedentes:** Si el sistema genera más energía de la que consume la casa, calcula la ganancia económica por vender esa energía a la red.

3.  **Sugerencia Inteligente:**
    *   Algoritmo que calcula automáticamente el número de paneles necesarios basándose en las *Horas Sol Pico (HSP)* específicas del departamento seleccionado.

---

## Stack Tecnológico

*   **Frontend:** HTML5, CSS3 (Grid/Flexbox), JavaScript (Vanilla ES6+).
*   **Backend:** Node.js, Express.
*   **Base de Datos:** Conexiones PostgreSQL.
*   **Herramientas:** CORS.

---

## Estructura del Proyecto

```text
RETO_SOLAR2/
├── backend/
│   ├── node_modules/
│   ├── .env               # Configuración de Base de Datos
│   ├── server.js          # API Híbrida
│   └── package.json
└── frontend/
    ├── index.html         # Interfaz de Usuario
    ├── script.js          # Lógica de cálculo y gráficos
    └── style.css          # Estilos visuales
