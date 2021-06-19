import express from 'express';
import cors from 'cors';
import Joi from 'joi';

const app = express();
app.use(cors());
app.use(express.json());

const messageSchema = Joi.object({
    from: Joi.string().min(1),
    to: Joi.string().min(1),
    text: Joi.string().min(1),
    type: Joi.string().min(1),
    time: Joi.string().min(1)
})

app.listen(process.env.PORT || 4000)