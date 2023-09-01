const redis = require("redis")
  .createClient({ legacyMode: true });

  (async () => {
    await redis.connect();
})();

redis.on("connect", function () {
  console.log("connected to redis!");
});

module.exports = redis;