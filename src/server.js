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

app.listen(process.env.PORT || 4000)