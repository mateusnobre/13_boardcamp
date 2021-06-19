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

app.get("/categories", (req, res) => {
    const query = connection.query('SELECT * FROM categories');
    query.then(result => {
        console.log(result.rows);
        res.status(200).send(result.rows);
    })
})

app.post("/categories", async (req, res) => {
    try{
        if (typeof req.body.name == undefined){
            return res.sendStatus(400);
        }
        let lastCategoryIdQuery = await connection.query('SELECT id FROM categories ORDER BY id DESC LIMIT 1')
        let lastCategoryId = 1; 
        console.log(lastCategoryIdQuery.rows[0].id);
        lastCategoryId = lastCategoryIdQuery.rows[0].id;

        let category = {id: lastCategoryId+1, name: req.body.name}
        const existCheckQuery = await connection.query('SELECT * FROM categories WHERE name= $1', [category.name]); 
        if(existCheckQuery.rows.length !== 0) {
            return res.sendStatus(409);
        }
        const query = await connection.query('INSERT INTO categories (id, name) VALUES ($1, $2)', [category.id, category.name]);    
        res.sendStatus(201);
    } catch(error){
        console.log(error);
        res.sendStatus(404);
    }

})

app.listen(process.env.PORT || 4000)