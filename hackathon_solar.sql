-- =========================================================
-- SCRIPT BASE DE DATOS: HACKATHON SOLAR (Región 6)
-- Versión Final: Dataset Oficial + Tarifas Reales 2024
-- =========================================================

-- 1. LIMPIEZA INICIAL
-- Borramos la base de datos si existe para empezar de cero
DROP DATABASE IF EXISTS hackathon_solar;
CREATE DATABASE hackathon_solar;
USE hackathon_solar;

-- ---------------------------------------------------------
-- TABLA 1: DATASET OFICIAL DEL RETO (Fuente de Verdad)
-- Contiene los datos históricos de producción en MWh.
-- ---------------------------------------------------------
CREATE TABLE dataset_produccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes VARCHAR(20),
    departamento VARCHAR(50),
    produccion_mwh INT
);

-- Insertamos EXACTAMENTE los datos que pedía el reto
INSERT INTO dataset_produccion (mes, departamento, produccion_mwh) VALUES 
('Enero', 'La Guajira', 320),
('Febrero', 'La Guajira', 340),
('Marzo', 'Cesar', 290),
('Abril', 'Atlántico', 310),
('Mayo', 'Magdalena', 305);

-- ---------------------------------------------------------
-- TABLA 2: LISTA DE MUNICIPIOS (Experiencia de Usuario)
-- Permite que el usuario elija su ciudad real.
-- ---------------------------------------------------------
CREATE TABLE lista_municipios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    departamento VARCHAR(50),
    municipio VARCHAR(50)
);

-- Insertamos ciudades principales de la Región Caribe
INSERT INTO lista_municipios (departamento, municipio) VALUES 
-- La Guajira (Promedio MWh: ~330)
('La Guajira', 'Riohacha'),
('La Guajira', 'Maicao'),
('La Guajira', 'Uribia'),
('La Guajira', 'Manaure'),

-- Cesar (Promedio MWh: ~290)
('Cesar', 'Valledupar'),
('Cesar', 'Aguachica'),
('Cesar', 'Codazzi'),

-- Atlántico (Promedio MWh: ~310)
('Atlántico', 'Barranquilla'),
('Atlántico', 'Soledad'),
('Atlántico', 'Puerto Colombia'),

-- Magdalena (Promedio MWh: ~305)
('Magdalena', 'Santa Marta'),
('Magdalena', 'Ciénaga'),
('Magdalena', 'Fundación');

-- ---------------------------------------------------------
-- TABLA 3: TARIFAS DE ENERGÍA (Realismo Económico)
-- Precios reales vigentes en la Costa (Air-e / Afinia 2024)
-- ---------------------------------------------------------
CREATE TABLE tarifas_energia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estrato VARCHAR(20),
    tarifa_kwh INT,         -- Precio en Pesos Colombianos
    consumo_promedio INT    -- Consumo típico en kWh
);

INSERT INTO tarifas_energia (estrato, tarifa_kwh, consumo_promedio) VALUES 
('Estrato 1', 380, 180),   -- Con Subsidio
('Estrato 2', 520, 220),   -- Con Subsidio
('Estrato 3', 790, 260),   -- Subsidio parcial
('Estrato 4', 980, 350),   -- TARIFA PLENA (Sin ayudas)
('Estrato 5', 1180, 500),  -- Tarifa Plena + 20% Contribución
('Estrato 6', 1250, 700);  -- Tarifa Plena + 20% Contribución

-- ---------------------------------------------------------
-- CONFIGURACIÓN DE SEGURIDAD (Para que conecte Node.js)
-- ---------------------------------------------------------
-- Creamos el usuario si no existe
CREATE USER IF NOT EXISTS 'solar_user'@'localhost' IDENTIFIED BY '12345';

-- Le damos permiso total sobre esta base de datos
GRANT ALL PRIVILEGES ON hackathon_solar.* TO 'solar_user'@'localhost';

-- Guardamos los cambios de permisos
FLUSH PRIVILEGES;