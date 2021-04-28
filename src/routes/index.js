const router = require('express').Router();
const bcrypt = require('bcrypt');//Para guardar las contraseñas
const saltRounds = 10;
const jwt = require('jsonwebtoken');
require('dotenv').config();

router.route("/").get((req,res)=>{
    res.json({
        alumnos: "MCR y MMM",
        servicio: "Proyecto Cloud"
    })
})

router.route("/register").post((req,res)=>{
    let user = req.body
    if(!(user.name&&user.email&&user.pass&&user.confirm)){
        //Falta algun dato
        res.sendStatus(418)
    }else{
        if(user.pass!=user.confirm){
            //Password missmatch
            res.sendStatus(400)
        }else{
            //Datos correctos, intentar registrar
            //TODO: Integrar registro con base de datos

            //Registro correcto
            let token = jwt.sign({//Token de sesion (tambien lo retorna login)
                email:user.email
            }, process.env.JWT_SECRET);
            res.json({token})
        }
    }
})

module.exports = router;