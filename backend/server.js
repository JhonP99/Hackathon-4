// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Configuración
const PORT = process.env.PORT || 3000;
const PG_CONNECTION_STRING = process.env.PG_CONNECTION_STRING;
const PG_SCHEMA = process.env.PG_SCHEMA || 'hackathon_solar';

let pgPool = null;

// ---------- 1. Inicialización de base de datos ----------
async function initDatabase() {
    if (!PG_CONNECTION_STRING) {
        throw new Error('Falta la variable de entorno PG_CONNECTION_STRING');
    }

    pgPool = new Pool({
        connectionString: PG_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    await pgPool.query(`set search_path to ${PG_SCHEMA}`);
    console.log('Conectado a PostgreSQL (Supabase)');
}

// ---------- Capa de acceso a datos ----------
async function executeQuery(sql, params = []) {
    const result = await pgPool.query(sql, params);
    return result.rows;
}

// ----------  Middlewares base ----------
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// ---------- Endpoints API ----------

// Departamentos
app.get('/api/departamentos', async (req, res, next) => {
    try {
        const sql = `
            SELECT departamento, AVG(produccion_mwh) AS promedio_mwh
            FROM hackathon_solar.dataset_produccion
            GROUP BY departamento`;
        const results = await executeQuery(sql);
        res.json(results);
    } catch (error) {
        next(error);
    }
});

// Municipios por departamento
app.get('/api/municipios/:dpto', async (req, res, next) => {
    try {
        const { dpto } = req.params;
        const sql = `
              SELECT municipio 
              FROM hackathon_solar.lista_municipios 
              WHERE departamento = $1`;
        const results = await executeQuery(sql, [dpto]);
        res.json(results);
    } catch (error) {
        next(error);
    }
});

// Tarifas de energía
app.get('/api/tarifas', async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM hackathon_solar.tarifas_energia';
        const results = await executeQuery(sql);
        res.json(results);
    } catch (error) {
        next(error);
    }
});

// ---------- Manejo de errores ----------
app.use((err, req, res, next) => {
    console.error('Error no controlado:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
});



// ---------- Arranque del servidor ----------
initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor backend escuchando en puerto ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('No se pudo iniciar la base de datos:', error);
        process.exit(1);
    });
