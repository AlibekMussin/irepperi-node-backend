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
        const sticker_text = $(element).find('.goods__sticker').text().trim();
        let has_sticker = false;
        if (sticker_text == "На заказ"){
          has_sticker = true;
        }
        
        const title = $(element).find('.goods__name ').text().trim();
        const price_str = $(element).find('.goods__value').text().trim();

        const price = parseInt(price_str.replace(/\s/g, ""), 10);

        const image = $(element).find('.goods__img img').attr('src');

        products.push({ id, section_title, title, price, image,sticker_text, has_sticker });
      });
    });

    res.json(products);
  } catch (error) {
    console.error('Error parsing website:', error);
    res.status(500).json({ error: 'Failed to parse website' });
  }
});

app.get('/api/goods/:id', async (req, res, id) => {
  try {
    const url = process.env.PARSING_SITE+'/product/'+req.params.id;
    console.log(url);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

   
    const container = $('.container');
    const element = $(container).find('.product__desc');
    const title = $(container).find('.product__title').text().trim();
    const price_str = $(container).find('.djs__price').text().trim();
    const description = $(element).find('.product__desc-body').text().trim();      
    const price = parseInt(price_str.replace(/\s/g, ""), 10);
    const images = [];
    $(container).find('.product__thumbnail').each((index, image_element) => {
      const image_src = $(image_element).find('img').attr('data-full');
      images.push({ image_src });
    });   

    product={ id, title, description, price, images };
      
   
    res.json(product);
  } catch (error) {
    console.error('Error parsing website:', error);
    res.status(500).json({ error: 'Failed to parse website' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});