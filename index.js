const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

// Conectar a la base de datos MongoDB
mongoose.connect('mongodb://localhost:27017/miBaseDeDatos', {})
    .then(() => console.log('Conexión a MongoDB exitosa'))
    .catch(err => console.error('No se pudo conectar a MongoDB:', err));

// Definir el modelo de datos genérico
const GenericJSON = mongoose.model('GenericJSON', new mongoose.Schema({}, {strict: false}));
const patenteJSON = mongoose.model('patente', new mongoose.Schema({}, {strict: false}));

// Crear la aplicación Express
const app = express();

// Configurar middleware
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});
// Ruta para recibir un JSON y almacenarlo en la base de datos
app.post('/api/guardar-json', async (req, res) => {
    const json = new GenericJSON(req.body);
    try {
        await json.save();
        res.status(201).send({message: 'JSON almacenado con éxito', id: json._id});
    } catch (error) {
        res.status(400).send({message: 'Error al almacenar el JSON', error});
    }
});

// Ruta para entregar todos los JSON almacenados
app.get('/api/obtener-jsons', async (req, res) => {
    try {
        const jsons = await GenericJSON.find();
        res.status(200).send(jsons);
    } catch (error) {
        res.status(500).send({message: 'Error al obtener los JSON almacenados', error});
    }
});// Ruta para entregar todos los JSON almacenados
app.get('/api/obtener-patentes', async (req, res) => {
    try {
        const jsons = await patenteJSON.find();
        res.status(200).send(jsons);
    } catch (error) {
        res.status(500).send({message: 'Error al obtener los JSON almacenados', error});
    }
});
app.get('/api/patente/:patente', async (req, res) => {
    let patente = req.params.patente
    let reintento = req.query.reintento
    let patenteExistente = await patenteJSON.findOne({patente: patente})
    if (patenteExistente) {
        console.log("patente existente");
        res.status(200).send(patenteExistente.results);
    } else {
        let resultado = await consultarPatente(patente, reintento)
        console.log(resultado);
        res.status(200).send(resultado);
    }
});
// Iniciar el servidor
const port = process.env.PORT || 7775;
app.listen(port, () => {
    console.log(`Servidor iniciado en el puerto ${port}`);
});

async function consultarPatente(patente, reintento = 0) {
    let browser = await puppeteer.launch({headless: false});

    try {
        let page = await browser.newPage();
        await page.goto('https://www.patentechile.com/');
        await page.setViewport({width: 800, height: 600});
        const searchResultSelector = '#txtTerm';
        await page.waitForSelector(searchResultSelector, {timeout: 10000});
        await page.type(searchResultSelector, patente)
        await page.type(searchResultSelector, patente)
        await page.type(searchResultSelector, patente)
        await page.type(searchResultSelector, patente)
        await page.type(searchResultSelector, patente)
        await page.type(searchResultSelector, patente)
        await page.type(searchResultSelector, patente)
        await page.type(searchResultSelector, patente)
        await page.type(searchResultSelector, patente)
        console.log("listo patente");
        const searchResultSelector2 = "#btnConsultar";
        await page.waitForSelector(searchResultSelector2,{timeout:10000});
        await page.click(searchResultSelector2);
        console.log("boton clicked");
        const datosTabla = "#tblDataVehicle > tbody"
        const datosError = "body > main > article > div.the-content > div:nth-child(7) > center > div > div > h2"
        console.log("resultados");
        //await page.waitForSelector(datosTabla,{timeout:10000});
        console.log("tabla");
        await waitForMultipleSelectors(page, [datosTabla,datosError], 10000);
        let results = []
        // Si el selector del elemento esperado se encuentra, realizar acciones
        if (await page.$('#tblDataVehicle > tbody')) {
            let results = await page.$eval('#tblDataVehicle > tbody', tbody => [...tbody.rows].map(r => [...r.cells].map(c => c.innerText)))
            results = results.filter(o => o.length > 1)
            results = results.map(o => {
                let obj = {
                    key: o[0],
                    value: o[1]
                }
                return obj
            })
            console.log(results);
            let objToSave = {
                patente: patente,
                results: results
            }
            let patenteJson = new patenteJSON(objToSave);
            await patenteJson.save();
        }

        // Si el selector del mensaje de error se encuentra, manejar el error
        if (await page.$('body > main > article > div.the-content > div:nth-child(7) > center > div > div > h2')) {
            throw new Error('Patente no encontrada');
        }



        await browser.close()
        return results

    } catch (error) {
        if (false) {
            await consultarPatente(patente, 1)
        } else {
            await browser.close()
            return {message: 'Error ', error};
        }

    }
}

async function waitForMultipleSelectors(page, selectors, timeout) {
    const promises = selectors.map((selector) =>
        page.waitForSelector(selector, { timeout })
    );

    try {
        await Promise.race(promises);
    } catch (error) {
        throw new Error(`No se encontró ninguno de los selectores: ${selectors}`);
    }
}