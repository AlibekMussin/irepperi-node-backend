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
    const csrf_token = $('head').find('meta[name="csrf-token"]').attr('content');
    console.log(csrf_token);
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
    const final = {csrf_token, products};
    res.json(final);
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
    const main_image = $(container).find('.product__display-image').find('img').attr('src');
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
    const info_1_blocks = [];
    const info_1 = [];
    const info_2 = [];
    
    const info_block_1 = $(container).find('.goodpop__bot1');
    const info_block_2 = $(container).find('.goodpop__bot2');
    
    $(info_block_1).find('.right').find('span').each((index, span_element) => {      
      info_1_blocks.push($(span_element).text());
    });
    const lower = $(info_block_1).find('.lower').text().trim().replace('\n','');
    info_1.push(info_1_blocks.join(" "), lower);

    $(info_block_2).find('.right').each((index, div_element) => {
      info_2.push($(div_element).text());
    });
    info = {info_1, info_2};

    product={ id, title, description, price, images, main_image, info };
      
   
    res.json(product);
  } catch (error) {
    console.error('Error parsing website:', error);
    res.status(500).json({ error: 'Failed to parse website' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});