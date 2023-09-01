const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const redis =require("./redis");
//const routes = require('./route'); 
 const util = require("util");
const uri = "mongodb://0.0.0.0:27017/";

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
//app.use('/', routes);

redis.set =util.promisify(redis.set);
redis.getAsync =util.promisify(redis.get);

mongoose.connect(uri+"redisDb");
console.log("connected");
const itemSchema = new mongoose.Schema({
    itemName:{
      type:String,
       //required:[true,"you should write name"]
      },
    category:String,
    price:Number,
    rating:{
      type:Number,
      min:1,
      max:5
    },
    features:String
})

const Item = mongoose.model("Item",itemSchema);
const mobile = new Item({
   itemName:"SamsungA12",
   category:"digital device",
   price:12000,
   rating:4,
   features:"surfing net"
})

const airconditioner = new Item({
   itemName:"Voltas",
   category:"Electronic device",
   price:120000,
   rating:3,
   features:"cooling ac"
})

const iron = new Item({
   itemName:"philips",
   category:"Electrical device",
   price:1200,
   rating:3,
   features:"Iron your clothings"
})
const defaultitems=[mobile,airconditioner,iron];

const ListSchema=({
  name:String,
  items:[itemSchema]
})

const List =mongoose.model("List",ListSchema);


app.get("/", async function(req, res) {
  try {
     let results;
    const cachedData = await redis.getAsync('Item');

    if (cachedData) {
      console.log('Data retrieved from Redis/cache');
      res.render("list", { listTitle: "today", newListItems: JSON.parse(cachedData)})
     
    } else {
       const results = await Item.find({});

      if (results.length === 0) {
        await Item.insertMany(defaultitems);
        
      }

      // Cache the data in Redis
      redis.setex('Item', 600, JSON.stringify(results));
      console.log('Data retrieved from MongoDB');
      res.render("list", { listTitle: "today", newListItems: results })
      //res.status(200).send(results);
    }
    
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});

app.post("/", async function(req, res) {
  try {
    const newFeature = req.body.newItem;
    const listName = req.body.list;

    const feature = new Item({
      features: newFeature
    });

    if (listName === "today") {
      await feature.save();
      console.log("Inserted");
      
    
      redis.del('Item', (err, reply) => {
        if (err) {
          console.error(err);
        } else {
          console.log('Redis cache for "Item" deleted');
        }
      });
      
       res.redirect("/");
      } else {
      res.redirect("/" + listName);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});

app.post("/delete", async (req, res) => {
  try {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === "today") {
      const deletedItem = await Item.findByIdAndRemove(checkedItemId);
      if (!deletedItem) {
        console.log("Item not found for deletion");
      } else {
        console.log("Deleted item:", deletedItem);
      }

      // Clear Redis cache for "Item" after item deletion
      redis.del('Item', (err, reply) => {
        if (err) {
          console.error(err);
        } else {
          console.log('Redis cache for "Item" deleted');
        }
      });

      res.redirect("/");
    } else {
      const updatedList = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } }
      );

      if (!updatedList) {
        console.log("List not found for item removal");
        return res.redirect("/" + listName);
      }

      // Clear Redis cache for "Item" after item removal
      redis.del('Item', (err, reply) => {
        if (err) {
          console.error(err);
        } else {
          console.log('Redis cache for "Item" deleted');
        }
      });

      res.redirect("/" + listName);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});


app.listen(5000, function() {
  console.log("Server started on port 5000");
});


module.exports=Item;