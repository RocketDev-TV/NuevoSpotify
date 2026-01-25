// music-server/index.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000; 

// A. Configuración de Seguridad
app.use(cors()); 
app.use(express.json());

// B. ¿Dónde se guardan los archivos? (Ruta física en tu disco)
const STORAGE_ROOT = path.join(__dirname, 'storage_musica');

// C. Configuración de Multer
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        // Recibimos la ruta deseada: "zoe/reptilectric/cancion.mp3"
        const relativePath = req.body.ruta || 'varios';
        const folderPath = path.dirname(relativePath); // "zoe/reptilectric"
        const fullPath = path.join(STORAGE_ROOT, folderPath);

        try {
            await fs.ensureDir(fullPath); // Crea la carpeta si no existe
            cb(null, fullPath);
        } catch (err) {
            console.error("Error creando carpeta:", err);
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        const relativePath = req.body.ruta;
        const fileName = path.basename(relativePath) || file.originalname.replace(/\s+/g, '_');
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });

// D. LA RUTA DE SUBIDA
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    console.log(`✅ Guardado: ${req.body.ruta}`);
    res.json({ message: 'OK', path: req.body.ruta });
});

// E. SERVIR ARCHIVOS (Para reproducir)
app.use('/musica', express.static(STORAGE_ROOT));

// F. Arrancar
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor listo en puerto ${PORT}`);
    console.log(`📂 Guardando en: ${STORAGE_ROOT}`);
});