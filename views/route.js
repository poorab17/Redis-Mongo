const express =require("express");
const router = express.Router();
const redisClient =require("./redis");
const Item = require("./app");

// Middleware to cache products using Redis
const cacheMiddleware = (req, res, next) => {
  const cacheKey = req.path;

  redisClient.get(cacheKey, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      res.send(JSON.parse(data));
    } else {
      next();
    }
  });
};

// Route to get products with Redis caching
router.get('/products', cacheMiddleware, async (req, res) => {
  try {
    const products = await Item.find();
    
    // Store products in Redis cache
    redisClient.setex(req.path, 3600, JSON.stringify(products));
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;