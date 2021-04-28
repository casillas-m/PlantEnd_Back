const router = require('express').Router();

router.route("/").get((req,res)=>{
    res.json({
        alumno: "MCR",
        servicio: "Proyecto Cloud"
    })
})

module.exports = router;