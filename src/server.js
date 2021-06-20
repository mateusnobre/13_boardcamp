import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import pg from 'pg';

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

const categorySchema = Joi.object({
    id: Joi.number().integer(),
    name: Joi.string().min(1),
})

const gameImageRegex = /^http:///;
const gameSchema = Joi.object({
    id: Joi.number().integer().required(),
    name: Joi.string().min(1).required(),
    image: Joi.string().pattern(gameImageRegex).required(),
    stockTotal: Joi.number().integer().min(0).required(),
    categoryId: Joi.number().integer().required(),
    pricePerDay: Joi.number().integer().min(0).required(),
    category: Joi.string().min(1).required(),
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
        if (req.body.name == ''){
            return res.sendStatus(400);
        }
        let lastGameIdQuery = await connection.query('SELECT id FROM games ORDER BY id DESC LIMIT 1')
        let lastGameId = 0; 
        if (lastGameIdQuery.rowCount >= 1){
            lastGameId = lastGameIdQuery.rows[0].id;
        }

        const existCheckQuery = await connection.query('SELECT * FROM games WHERE name= $1', [req.body.name]); 
        if(existCheckQuery.rows.length !== 0) {
            console.log(existCheckQuery.rows)
            return res.sendStatus(409);
        }
        
        const existCategoryCheckQuery = await connection.query('SELECT * FROM categories WHERE id= $1', [req.body.categoryId]); 
        if(existCategoryCheckQuery.rows.length == 0) {
            return res.sendStatus(400);
        }
        else{
            let categoryName = existCategoryCheckQuery.rows[0].id;
            let game = {id: lastGameId+1,
                        name: req.body.name,
                        image: req.body.image,
                        stockTotal: req.body.stockTotal,
                        categoryId: req.body.categoryId,
                        pricePerDay: req.body.pricePerDay,
                        categoryName: categoryName
                        }
            gameSchema.validate(game);
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


app.listen(process.env.PORT || 4000)