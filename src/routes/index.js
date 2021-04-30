const router = require('express').Router();
const bcrypt = require('bcrypt');//Para guardar las contraseñas
const saltRounds = 10;
const jwt = require('jsonwebtoken');
require('dotenv').config();

router.route("/").get((req, res) => {
    res.json({
        alumnos: "MCR y MMM",
        servicio: "Proyecto Cloud"
    })
})

router.route("/register").post((req, res) => {
    let user = req.body
    if (!(user.name && user.email && user.pass && user.confirm)) {
        //Falta algun dato
        res.sendStatus(418)
    } else {
        if (user.pass != user.confirm) {
            //Password missmatch
            res.sendStatus(400)
        } else {
            //Datos correctos, intentar registrar (correo repetido?)
            bcrypt.hash(user.pass, saltRounds).then(function (hash) {
                //TODO: Integrar registro con base de datos


                if (false) {//Correo repetido
                    res.sendStatus(406)
                } else {
                    //Registro correcto
                    let token = jwt.sign({//Token de sesion
                        email: user.email,
                        name: user.name
                    }, process.env.JWT_SECRET);
                    res.json({ token })
                }
            });
        }
    }
})

router.route("/login").post((req, res) => {
    let user = req.body
    if (!(user.email && user.pass)) {
        //Falta algun dato
        res.sendStatus(418)
    } else {
        //TODO: Solicitar Hash, Email y Nombre de pass a DB
        let userDB = {
            hash:"",
            name:"Martin",
            email:"a@a"
        }
        bcrypt.compare(user.pass, userDB.hash).then(function (result) {
            result=true//BORRAR ESTO-----------------------------------------------------------------------------
            if (!result) {
                //Password incorrecto
                res.sendStatus(401)
            } else {
                let token = jwt.sign({//Token de sesion
                    email: userDB.email,
                    name: userDB.name
                }, process.env.JWT_SECRET);
                res.json({ token })
            }
        });
    }
})

module.exports = router;