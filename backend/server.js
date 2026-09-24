const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint 1: Health check del servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NetworkingApp Backend API'
  });
});

// Endpoint 2: Prueba de conexión a la base de datos MySQL (Solo lectura / Verificación)
app.get('/api/db-test', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 AS connection_test');
    res.json({
      success: true,
      message: 'Conexión a MySQL empresarial exitosa',
      database: process.env.DB_NAME || 'wwsilh_uat',
      result: rows
    });
  } catch (error) {
    console.error('Error al conectar a la base de datos MySQL:', error.code || error.message);
    res.status(500).json({
      success: false,
      message: 'Error al conectar a la base de datos MySQL',
      error: error.message,
      code: error.code || null
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
