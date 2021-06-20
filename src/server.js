import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import pg from 'pg';
import { cursorTo } from 'readline';

const { Pool } = pg;

const user = 'postgres';
const password = 'h4ck3rismo';
const host = 'localhost';
const port = 5432;
const database = 'boardcamp';

const connection = new Pool({
  user,
  password,
  host,
  port,
  database
});

const app = express();
app.use(cors());
app.use(express.json());


const gameImageRegex = /^http:///;

const gameSchema = Joi.object({
    id: Joi.number().integer().min(1).required(),
    name: Joi.string().min(1).required(),
    image: Joi.string().pattern(gameImageRegex).required(),
    stockTotal: Joi.number().integer().min(1).required(),
    categoryId: Joi.number().integer().min(1).required(),
    pricePerDay: Joi.number().integer().min(1).required()
})

const stringOfNumbersRegex = /^[0-9]+$/

const customerSchema = Joi.object({
    id: Joi.number().integer().min(1).required(),
    name: Joi.string().min(1).required(),
    phone: Joi.string().regex(stringOfNumbersRegex).min(10).max(11).required(),
    cpf: Joi.string().regex(stringOfNumbersRegex).min(11).max(11).required(),
    birthday: Joi.date().required(),
})

const rentalSchema = Joi.object({
    id: Joi.number().integer().min(1).required(),
    customerId: Joi.number().integer().min(1).required(),
    gameId: Joi.number().integer().min(1).required(),
    rentDate: Joi.date().required(),
    daysRented: Joi.number().integer().min(0),
    returnDate: Joi.date(),
    originalPrice: Joi.number().integer().min(0).required(),    
    delayFee: Joi.number().integer().min(0)
})

app.get("/categories", (req, res) => {
    const query = connection.query('SELECT * FROM categories');
    query.then(result => {
        console.log(result.rows);
        res.status(200).send(result.rows);
    })
})

app.post("/categories", async (req, res) => {
    try{
        if (req.body.name == ''){
            return res.sendStatus(400);
        }
        let lastCategoryIdQuery = await connection.query('SELECT id FROM categories ORDER BY id DESC LIMIT 1')
        let lastCategoryId = 0; 
        if (lastCategoryIdQuery.rowCount >= 1){
            lastCategoryId = lastCategoryIdQuery.rows[0].id;
        }

        let category = {id: lastCategoryId+1, name: req.body.name}
        const existCheckQuery = await connection.query('SELECT * FROM categories WHERE name= $1', [category.name]); 
        if(existCheckQuery.rows.length !== 0) {
            return res.sendStatus(409);
        }
        console.log(category);
        const query = await connection.query('INSERT INTO categories (id, name) VALUES ($1, $2)', [category.id, category.name]);    
        res.sendStatus(201);
    } catch(error){
        console.log(error);
        res.sendStatus(404);
    }
})

app.get("/games", async (req, res) => {
    try {
        if (typeof req.query.name !== 'undefined'){
            const gameName = req.query.name;
            const query = await connection.query(`
            SELECT g.id, g.name, g.image, g."stockTotal", g."categoryId", g."pricePerDay", c.name as "categoryName" 
            FROM games g
                LEFT JOIN categories c on "categoryId"=c.id
            WHERE g.name ILIKE '${gameName}%'`);
            res.status(200).send(query.rows);
        }
        else {
            const query = await connection.query(`
            SELECT g.id, g.name, g.image, g."stockTotal", g."categoryId", g."pricePerDay", c.name as "categoryName" 
            FROM games g
                LEFT JOIN categories c on "categoryId"=c.id`);
            res.status(200).send(query.rows);
        }
    }
    catch(error){
        console.log(error);
        res.sendStatus(404);
    }
})

app.post("/games", async (req, res) => {
    try{
        let lastGameIdQuery = await connection.query('SELECT id FROM games ORDER BY id DESC LIMIT 1')
        let lastGameId = 0; 
        if (lastGameIdQuery.rowCount >= 1){
            lastGameId = lastGameIdQuery.rows[0].id;
        }

        const existCheckQuery = await connection.query('SELECT * FROM games WHERE name= $1', [req.body.name]); 
        if(existCheckQuery.rows.length !== 0) {
            return res.sendStatus(409);
        }
        
        const existCategoryCheckQuery = await connection.query('SELECT * FROM categories WHERE id= $1', [req.body.categoryId]); 
        if(existCategoryCheckQuery.rows.length == 0) {
            return res.sendStatus(400);
        }
        else{
            let game = {id: lastGameId+1,
                        name: req.body.name,
                        image: req.body.image,
                        stockTotal: req.body.stockTotal,
                        categoryId: req.body.categoryId,
                        pricePerDay: req.body.pricePerDay
                        }
            const { error, value } = gameSchema.validate(game);
            if (typeof error !== 'undefined'){
                return res.sendStatus(400);
            }
            console.log(game)
            const query = await connection.query('INSERT INTO games (id, name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5, $6)',
             [game.id, game.name, game.image, game.stockTotal, game.categoryId, game.pricePerDay]);    
            res.sendStatus(201);
        }
    } catch(error){
        console.log(error);
        res.sendStatus(400);
    }
})

app.get("/customers", async (req, res) => {
    try {
        if (typeof req.query.cpf !== 'undefined'){
            const cpf = req.query.cpf;
            const query = await connection.query(`
            SELECT * 
            FROM customers
            WHERE cpf ILIKE '${cpf}%'`);
            res.status(200).send(query.rows);
        }
        else {
            const query = await connection.query(`
            SELECT * 
            FROM customers`);
            res.status(200).send(query.rows);
        }
    }
    catch(error){
        console.log(error);
        res.sendStatus(404);
    }
})

app.get('/customers/:customerId', async (req, res) => {
    const id = req.params.customerId;
    try{
        const query = await connection.query(`
        SELECT * 
        FROM customers
        WHERE id =${id}`);
        res.status(200).send(query.rows);
    }
    catch(error){
        console.log(error);
        res.sendStatus(404);
    }
});

app.post("/customers", async (req, res) => {
    try{
        let lastCustomerIdQuery = await connection.query('SELECT id FROM customers ORDER BY id DESC LIMIT 1')
        let lastCustomerId = 0; 
        if (lastCustomerIdQuery.rowCount >= 1){
            lastCustomerId = lastCustomerIdQuery.rows[0].id;
        }
        
        const existCPFCheckQuery = await connection.query('SELECT * FROM customers WHERE cpf= $1', [req.body.cpf]); 
        if(existCPFCheckQuery.rows.length > 0) {
            return res.sendStatus(409);
        }
        else{
            let customer = {id: lastCustomerId+1,
                        name: req.body.name,
                        phone: req.body.phone,
                        cpf: req.body.cpf,
                        birthday: req.body.birthday
                        }
            const { error, value } = customerSchema.validate(customer);
            if (typeof error !== 'undefined'){
                return res.sendStatus(400);
            }
            console.log(customer)
            const query = await connection.query('INSERT INTO customers (id, name, phone, cpf, birthday) VALUES ($1, $2, $3, $4, $5)',
             [customer.id, customer.name, customer.phone, customer.cpf, customer.birthday]);    
            res.sendStatus(201);
        }
    } catch(error){
        console.log(error);
        res.sendStatus(400);
    }
})

app.put("/customers/:customerId", async (req, res) => {
    const id = parseInt(req.params.customerId);
    try{
        const existCPFCheckQuery = await connection.query('SELECT * FROM customers WHERE cpf=$1 AND id !=$2', [req.body.cpf, id]); 
        if(existCPFCheckQuery.rows.length > 0) {
            return res.sendStatus(409);
        }
        else{
            let customer = {id: id,
                        name: req.body.name,
                        phone: req.body.phone,
                        cpf: req.body.cpf,
                        birthday: req.body.birthday
                        }
            const { error, value } = customerSchema.validate(customer);
            if (typeof error !== 'undefined'){
                return res.sendStatus(400);
            }
            console.log(customer)
            const query = await connection.query(`
                UPDATE customers
                SET name='${customer.name}',
                    phone='${customer.phone}',
                    cpf='${customer.cpf}',
                    birthday='${customer.birthday}'
                WHERE id = ${id}`);    
            res.sendStatus(201);
        }
    }
    catch(error){
        console.log(error);
        res.sendStatus(404);
    }
})


app.get("/rentals", async (req, res) => {
    try {
        if (typeof req.query.customerId !== 'undefined' && typeof req.query.gameId !== 'undefined'){
            const customerId = req.query.customerId;
            const gameId = req.query.gameId;
            const query = await connection.query(`
            SELECT r.id,
                r."customerId",
                r."gameId",
                r."rentDate",
                r."daysRented",
                r."returnDate",
                r."originalPrice",
                r."delayFee",
                JSON_BUILD_OBJECT('id', c.id, 'name',c.name) AS customer,
                JSON_BUILD_OBJECT('id', g.id, 'name',g.name, 'categoryId', g."categoryId", 'categoryName', cat.name) AS game
            FROM rentals r
                LEFT JOIN customers c on c.id = r."customerId"
                LEFT JOIN games g on g.id = r."gameId"
                LEFT JOIN categories cat on cat.id = g."categoryId"
            WHERE "gameId"=${gameId}
                AND "customerId"=${customerId}`);
            res.status(200).send(query.rows);
        }
        else if (typeof req.query.customerId !== 'undefined'){
            const customerId = req.query.customerId;
            const query = await connection.query(`
            SELECT r.id,
                r."customerId",
                r."gameId",
                r."rentDate",
                r."daysRented",
                r."returnDate",
                r."originalPrice",
                r."delayFee",
                JSON_BUILD_OBJECT('id', c.id, 'name',c.name) AS customer,
                JSON_BUILD_OBJECT('id', g.id, 'name',g.name, 'categoryId', g."categoryId", 'categoryName', cat.name) AS game
            FROM rentals r
                LEFT JOIN customers c on c.id = r."customerId"
                LEFT JOIN games g on g.id = r."gameId"
                LEFT JOIN categories cat on cat.id = g."categoryId"
            WHERE "customerId"=${customerId}`);
            res.status(200).send(query.rows);
        }
        else if (typeof req.query.gameId !== 'undefined'){
            const gameId = req.query.gameId;
            const query = await connection.query(`
            SELECT r.id,
                r."customerId",
                r."gameId",
                r."rentDate",
                r."daysRented",
                r."returnDate",
                r."originalPrice",
                r."delayFee",
                JSON_BUILD_OBJECT('id', c.id, 'name',c.name) AS customer,
                JSON_BUILD_OBJECT('id', g.id, 'name',g.name, 'categoryId', g."categoryId", 'categoryName', cat.name) AS game
            FROM rentals r
                LEFT JOIN customers c on c.id = r."customerId"
                LEFT JOIN games g on g.id = r."gameId"
                LEFT JOIN categories cat on cat.id = g."categoryId"
            WHERE r."gameId"=${gameId}}`);
            res.status(200).send(query.rows);
        }
        else {
            const query = await connection.query(`
            SELECT r.id,
                r."customerId",
                r."gameId",
                r."rentDate",
                r."daysRented",
                r."returnDate",
                r."originalPrice",
                r."delayFee",
                JSON_BUILD_OBJECT('id', c.id, 'name',c.name) AS customer,
                JSON_BUILD_OBJECT('id', g.id, 'name',g.name, 'categoryId', g."categoryId", 'categoryName', cat.name) AS game
            FROM rentals r
                LEFT JOIN customers c on c.id = r."customerId"
                LEFT JOIN games g on g.id = r."gameId"
                LEFT JOIN categories cat on cat.id = g."categoryId"`);
            res.status(200).send(query.rows);
        }
    }
    catch(error){
        console.log(error);
        res.sendStatus(404);
    }
})

app.post("/rentals", async (req, res) => {
    try{
        let lastRentalIdQuery = await connection.query('SELECT id FROM rentals ORDER BY id DESC LIMIT 1')
        let lastRentalId = 0; 
        if (lastRentalIdQuery.rowCount >= 1){
            lastRentalId = lastRentalIdQuery.rows[0].id;
        }
        
        const GameCountCheckQuery = await connection.query(`
            WITH games_count AS (
                SELECT COUNT(1) AS count FROM games
            ),
            rentals_count AS(
                SELECT COUNT(1) AS count FROM rentals
            )
            SELECT (g.count > r.count) AS "hasGame"
            FROM games_count g, rentals_count r`); 
        if(!GameCountCheckQuery.rows[0].hasGame) {
            return res.sendStatus(400);
        }
        
        const existCustomerIdCheckQuery = await connection.query('SELECT * FROM customers WHERE id= $1', [req.body.customerId]); 
        if(existCustomerIdCheckQuery.rows.length == 0) {
            return res.sendStatus(400);
        }
        const existGameIdCheckQuery = await connection.query('SELECT * FROM games WHERE id= $1', [req.body.gameId]); 
        if(existGameIdCheckQuery.rows.length == 0) {
            return res.sendStatus(400);
        }

        else{
            const gamePriceQuery = await connection.query('SELECT * FROM games WHERE id= $1', [req.body.gameId]); 
            let rental = {id: lastRentalId+1,
                        customerId: req.body.customerId,
                        gameId: req.body.gameId,
                        rentDate: new Date(),
                        daysRented: req.body.daysRented,
                        originalPrice: req.body.daysRented * gamePriceQuery.rows[0].pricePerDay,    
                        }
            const { error, value } = rentalSchema.validate(rental);
            console.log(error)
            if (typeof error !== 'undefined'){
                return res.sendStatus(400);
            }
            console.log(rental)
            const query = await connection.query('INSERT INTO rentals (id, "customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
             [rental.id, rental.customerId, rental.gameId, rental.rentDate, rental.daysRented, null, rental.originalPrice, 0]);
            res.sendStatus(201);
        }
    } catch(error){
        console.log(error);
        res.sendStatus(400);
    }
})

app.post("/rentals/:rentalId/return", async (req, res) => {
    const id = parseInt(req.params.rentalId);
    try{
        const existRentalIdCheckQuery = await connection.query('SELECT * FROM rentals WHERE id=$1', [id]); 
        if(existRentalIdCheckQuery.rows.length == 0) {
            return res.sendStatus(404);
        }
        else if(existRentalIdCheckQuery.rows[0].returnDate !== null) {
            return res.sendStatus(400);
        }

        else{
            const delayFeeQuery = await connection.query(`
                SELECT  g."pricePerDay"*DATE_PART('day', NOW() - ("rentDate" + "daysRented" * INTERVAL '1 day')) as "delayFee"
                FROM rentals r
                LEFT JOIN games g on g.id = r."gameId"
                WHERE r.id=${id}
            `)
            console.log(delayFeeQuery.rows[0])
            let delayFee = delayFeeQuery.rows[0].delayFee;
            if (delayFee < 0){
                delayFee = 0;
            }
            const query = await connection.query(`
                UPDATE rentals 
                SET "returnDate" = NOW(),
                    "delayFee" = ${delayFee} 
                WHERE id=${id}`)
            res.sendStatus(200);
        }
    } catch(error){
        console.log(error);
        res.sendStatus(400);
    }
})
app.listen(process.env.PORT || 4000)