const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();


const express = require('express');
const cors = require("cors");
const app = express();
const port = process.env.PORT;

const allowOriginUrls = process.env.ALLOW_ORIGIN_URL.split(',');

app.use(cors({
    credentials:true,
    origin: allowOriginUrls
    }));

app.get('/api/goods', async (req, res) => {
  try {
    const url = process.env.PARSING_SITE;
    console.log(url);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const products = [];
    
    $('.hormen__section').each((head_index, head_element) => {       

      const section_title = $(head_element).find('.hormen__title').text().trim();
      $(head_element).find('.goods__cell').each((index, element) => {

        const id = $(element).attr('data-id');
        const title = $(element).find('.goods__name ').text().trim();
        const price_str = $(element).find('.goods__value').text().trim();

        const price = parseInt(price_str.replace(/\s/g, ""), 10);

        const image = $(element).find('.goods__img img').attr('src');

        products.push({ id, section_title, title, price, image });
      });
    });

    res.json(products);
  } catch (error) {
    console.error('Error parsing website:', error);
    res.status(500).json({ error: 'Failed to parse website' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});