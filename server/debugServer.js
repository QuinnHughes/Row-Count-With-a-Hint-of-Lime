const express = require('express');
const app = express();
app.get('/ping', (req,res)=>res.json({pong:true}));
app.listen(8090, ()=> console.log('Debug server on 8090')); 