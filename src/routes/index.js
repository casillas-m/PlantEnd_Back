const router = require('express').Router();
const bcrypt = require('bcrypt'); //Para guardar las contraseñas
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const request = require('request');
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
                const options = {
                    method: 'POST',
                    url: process.env.URL_USERS,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: {
                        email: user.email,
                        name: user.name,
                        password: hash
                    },
                    json: true
                };

                request(options, function (error, response, body) {
                    if (error) throw new Error(error);
                    else if (response.status == 406) { //Correo repetido
                        res.sendStatus(406)
                    } else {
                        //Registro correcto
                        let token = jwt.sign({ //Token de sesion
                            email: user.email,
                            name: user.name
                        }, process.env.JWT_SECRET);
                        res.json({
                            token
                        })
                    }

                });

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
        const options = {
            method: 'GET',
            url: process.env.URL_USERS,
            qs: { email: user.email }
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);
            let data = JSON.parse(body)
            bcrypt.compare(user.pass, data.password).then(function (result) {
                if (!result) {
                    //Password incorrecto
                    res.sendStatus(401)
                } else {
                    let token = jwt.sign({ //Token de sesion
                        email: data.email,
                        name: data.name
                    }, process.env.JWT_SECRET);
                    res.json({
                        token
                    })
                }
            }).catch((e) => console.log(e))
        });

    }
})

router.route("/myplants").get((req, res) => {
    let correo = jwt.verify(req.query.token, process.env.JWT_SECRET).email
    const options = {
        method: 'GET',
        url: process.env.URL_PLANTS,
        qs: { email: correo }
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        res.send(body)
    });
})

module.exports = router;