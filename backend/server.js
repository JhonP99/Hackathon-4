require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importamos ambas librerías
const mysql = require('mysql2/promise'); // Usamos la versión con Promesas (más moderna)
const { Pool } = require('pg');

const app = express();
app.use(cors());

// LEER CONFIGURACIÓN DEL .ENV
const DB_TYPE = process.env.DB_TYPE || 'mysql'; // Por defecto MySQL

let pgPool = null;
let mysqlPool = null;

// --- 1. CONEXIÓN INTELIGENTE ---
async function iniciarBaseDeDatos() {
    if (DB_TYPE === 'postgres') {
        console.log("☁️  MODO NUBE: Conectando a PostgreSQL...");
        pgPool = new Pool({
            connectionString: process.env.PG_CONNECTION_STRING,
            ssl: { rejectUnauthorized: false } // Necesario para Render/Neon/Supabase
        });
    } else {
        console.log("💻 MODO LOCAL: Conectando a MySQL...");
        mysqlPool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'solar_user',
            password: process.env.MYSQL_PASS || '12345',
            database: process.env.MYSQL_NAME || 'hackathon_solar'
        });
    }
}

iniciarBaseDeDatos();

// En server.js, agrega esto después de app.use(cors());
app.use(express.static('../frontend')); // Sirve los archivos de la carpeta hermana

// --- 2. FUNCIÓN "TRADUCTORA" (La Magia) ---
// Esta función permite que tus rutas no sepan qué base de datos hay detrás.
async function ejecutarConsulta(sql, params = []) {
    try {
        if (DB_TYPE === 'postgres') {
            // TRUCO: Postgres usa $1, $2... MySQL usa ?
            // Convertimos los '?' de MySQL a '$1, $2' para Postgres automáticamente
            let i = 1;
            const sqlPg = sql.replace(/\?/g, () => `$${i++}`);
            
            const res = await pgPool.query(sqlPg, params);
            return res.rows; // Postgres devuelve los datos aquí
        } else {
            // MySQL
            const [rows] = await mysqlPool.execute(sql, params);
            return rows;
        }
    } catch (error) {
        console.error("❌ Error en Base de Datos:", error.message);
        throw error; // Lanzamos el error para que la ruta lo maneje
    }
}

/* =========================================
   API ENDPOINTS (Tus rutas originales)
   Ahora usan 'ejecutarConsulta' en vez de 'db.query'
   ========================================= */

// 1. DATASET OFICIAL
app.get('/api/departamentos', async (req, res) => {
    try {
        const sql = `
            SELECT departamento, AVG(produccion_mwh) as promedio_mwh 
            FROM dataset_produccion 
            GROUP BY departamento
        `;
        const results = await ejecutarConsulta(sql);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Error obteniendo departamentos" });
    }
});

// 2. MUNICIPIOS
app.get('/api/municipios/:dpto', async (req, res) => {
    try {
        const { dpto } = req.params;
        const sql = 'SELECT municipio FROM lista_municipios WHERE departamento = ?';
        // Pasamos 'dpto' como parámetro seguro
        const results = await ejecutarConsulta(sql, [dpto]);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Error obteniendo municipios" });
    }
});

// 3. TARIFAS
app.get('/api/tarifas', async (req, res) => {
    try {
        const sql = 'SELECT * FROM tarifas_energia';
        const results = await ejecutarConsulta(sql);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Error obteniendo tarifas" });
    }
});

// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend listo en puerto ${PORT} usando [${DB_TYPE.toUpperCase()}]`);
});