const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const FormData = require('form-data');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require("cors");
const app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(cookieParser());
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

    const setCookieHeader = response.headers['set-cookie'];
    const cookies = parseCookies(setCookieHeader);

    // Retrieve cookie by key
    const lara_session = cookies['laravel_session'];
    const xsrf_token = cookies['XSRF-TOKEN'];
    
    const products = [];
    const csrf_token = $('head').find('meta[name="csrf-token"]').attr('content');
    // console.log("csrf_token: ", csrf_token);
    // console.log("lara_session: ", lara_session);
    // console.log("xsrf_token: ", xsrf_token);

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
    const final = {csrf_token, lara_session, xsrf_token, products};
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


app.get('/api/order', async (req, res) => {
  try {
    const url_order = process.env.PARSING_SITE+'/order'
    const url_cart = process.env.PARSING_SITE+'/cart'
    
    const cookie_str = req.headers['cookies'];    
    console.log('cookie_str', cookie_str);
    const headers = {
      'Cookie': cookie_str,
    };
    const response = await axios.get(url_order,{headers: headers});
    const $ = cheerio.load(response.data);    
    const total_first_str = $('.container').find('.order__finish').find('.djs__order-sum').text().trim();    
    const total_first = parseInt(total_first_str.replace(/\s/g, ""), 10);
    const total_str = $('.container').find('.order__finish').find('.right').find('.djs__total').text().trim();    
    const delivery_str = $('.container').find('.order__delivery').find('.right').text().trim();
    const total = parseInt(total_str.replace(/\s/g, ""), 10);
    const delivery = parseInt(delivery_str.replace(/\s/g, ""), 10);
    console.log('total: ', total);

    const response_cart = await axios.get(url_cart,{headers: headers});
    const $el = cheerio.load(response_cart.data);        
    const goods = [];
    $el('.container').find('.cart__single').each((index, element_cart) => {
      let product_name = $(element_cart).find('.cart__name').text().trim();
      let package_name = $(element_cart).find('.package__name').text().trim();
      let price_str = $(element_cart).find('.cart__product').find('.cart__price').find('.cart__price-single').text().trim();
      let price = parseInt(price_str.replace(/\s/g, ""), 10);
      let products_count = $(element_cart).find('.djs__cart-input').attr('value');
      let product_img = $(element_cart).find('.cart__left div img').attr('src');

      let common_price = price*products_count;
      
      let good = {product_img, product_name, package_name, price, products_count, common_price};
      goods.push(good);
    });
    // const total = parseInt(total_str.replace(/\s/g, ""), 10);
    // console.log('goods: ', goods);
    
    product={goods, total_first, delivery, total };         
    
    res.json(product);
  } catch (error) {
    console.error('Error parsing website:', error);
    res.status(500).json({ error: 'Failed to parse website' });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    const cookie_str = req.headers['cookies'];    
    // const cookie_str = 'XSRF-TOKEN=eyJpdiI6IjZ6a3ZMM0I4d3dJQWxBYWlBcTlmR2c9PSIsInZhbHVlIjoicTFWcEtLMWNnMU05L25FeVE3ZGhwVWdIV1Exdk43c0VoSG9UUzZLbXB6MWg4Q28rRlpMcTNWV1N2NmJ2WFBDazhqTHRJUWNMa2lwcGYvb1d3QytvQ3kxZStGMkYzSzdKY2Q2eFp6UzJ0UWpxSG5aMzZnU0tkSXRvSlpQTEJobVoiLCJtYWMiOiI5MWVmMzU4NzIzZTljZTU1MTAwY2YwY2FiOTg4YTI3NGM1MzJkZmExZDkzODU3NjE5OWY0NGY0MTNmYTMxNWIyIn0%3D; laravel_session=eyJpdiI6ImJ5U09rUEdEakZZUUhwYlBYNDFBckE9PSIsInZhbHVlIjoiOGJpV3BPMzVkVTluby9DVjZCbDhoQWJBSUhIU0pkcW5lL1NPQVRQVmhNaG1xUHR3SDhIRG90b1FSdlNHQXpkZG1oTGlld1FsQWNZZjEyeS8zTnFSWGlnd2Z2Mlg1bWVPZmJyQU96MWNOZDVhVUJIeVhEYzRsRzBpRnY2Z3ZPM0IiLCJtYWMiOiJhNjA4MTMzMTZkYTVjMzlhZGIyNWI3NTNhNWU2MDdhNmRjMjk1YWEyNjg3NmUxODk2MThjY2RiODg3YWJlZjE1In0%3D';
    console.log('cookie_str', cookie_str);
    const body = req.body
    const headers = {
      'Cookie': cookie_str,
    };
    console.log(body);

    const formData = new FormData();
    formData.append('firstname', body.firstName);
    formData.append('lastname', body.lastName);

    formData.append('phone', body.phoneNumber);
    formData.append('delivery_type', body.deliveryMethod);
    formData.append('delivery_city', body.city);
    formData.append('delivery_street', body.streetName);

    formData.append('delivery_house', body.phoneNumber);
    formData.append('delivery_flat', body.deliveryMethod);
    formData.append('payment', 'kaspi');
    formData.append('promocode', '');
    formData.append('_method', 'PUT');
    formData.append('_token', body.token);

    const response = await axios.post('https://irepperi.kz/order', formData, {
      headers: {
        ...formData.getHeaders(),
        Cookie: cookie_str
      }, // Установка заголовков для FormData
    });

    console.log(response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Error send order:', error);
    res.status(500).json({ error: 'Failed to parse website' });
  }
});

app.post('/api/cart', async (req, res) => {
  try {
    const url_cart = process.env.PARSING_SITE+'/cart'
    const cookies = req.cookies;
    const body = req.body
    const cookie_str = body.cookie_str
    
    const headers = {
      'Cookie': cookie_str,
    };
    

    const sending_body = {
      "product": body.product_id,
      "action": body.action,
      "amount": 1,
      "package": -1,
      "_token":body.token
    };
    
    const response = await axios.post(url_cart,sending_body,{headers: headers});    
    
    res.json(response.text);
  } catch (error) {
    console.error('Error parsing website:', error);
    res.status(500).json({ error: 'Failed to parse website' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

function parseCookies(setCookieHeader) {
  const cookies = {};

  if (setCookieHeader) {
    setCookieHeader.forEach((cookie) => {
      const [name, value] = cookie.split(';')[0].split('=');
      cookies[name.trim()] = value.trim();
    });
  }

  return cookies;
}