const router = require('express').Router();
const bcrypt = require('bcrypt'); //Para guardar las contraseñas
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const request = require('request');
const multer = require('multer');
let upload = multer({ dest: 'uploads/' })
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();


const fs = require('fs');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

let timersArr = []

router.route("/").get((req, res) => {
    res.json({
        alumnos: "MCR y MMM",
        servicio: "Proyecto Cloud"
    })
})

router.route("/register").post((req, res) => {
    let user = req.body
    if (!(user.name && user.email && user.pass && user.confirm && user.phone)) {
        //Falta algun dato
        res.sendStatus(418)
    } else {
        if (user.pass != user.confirm) {
            //Password missmatch
            res.sendStatus(400)
        } else {
            //Datos correctos, intentar registrar (correo repetido?)
            const options = {
                method: 'GET',
                url: process.env.URL_USERS,
                qs: { email: user.email }
            };
            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                let data = JSON.parse(body)
                if (data.errorType) {//Correo no usado
                    bcrypt.hash(user.pass, saltRounds).then(function (hash) {
                        const options = {
                            method: 'POST',
                            url: process.env.URL_USERS,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                email: user.email,
                                name: user.name,
                                password: hash,
                                phone: user.phone
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
                } else {
                    res.sendStatus(406)
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
    try {
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
    } catch (error) {
        res.sendStatus(401)
    }
})

router.route("/plants").get((req, res) => {
    try {
        if (req.query.token == "" || req.query.plant == "") throw 400
        jwt.verify(req.query.token, process.env.JWT_SECRET).email

        const options = {
            method: 'GET',
            url: process.env.URL_API_TREFLE,
            qs: { plant: req.query.plant }
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);
            // res.setHeader('Content-Type', 'application/json' )
            res.json({ light: JSON.parse(body).light, hum: JSON.parse(body).hum })
        });
    } catch (error) {
        res.sendStatus(error == 400 ? 400 : 401)
    }
})

router.route("/plants").post((req, res) => {
    if (["token", "plant_name", "img_url", "common_name", "light_needed", "hum_needed", "soil", "water"].some(e => req.body[e] == "")) {
        res.sendStatus(400) //Información faltante
    } else {
        try {
            let correo = jwt.verify(req.body.token, process.env.JWT_SECRET).email
            let uuid = uuidv4();
            let forma = JSON.parse(JSON.stringify(req.body)) //Clonando de objetos como un campeon
            forma.email = correo
            forma.plant_id = uuid
            const options = {
                method: 'POST',
                url: process.env.URL_PLANTS,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(forma)
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                res.send()
            });
        } catch (error) {
            console.log('------------------------------------');
            console.log(error);
            console.log('------------------------------------');
            res.sendStatus(401)
        }
    }
})

router.route("/plants").put((req, res) => {
    if (["token"].some(e => req.body[e] == "")) {
        res.sendStatus(400) //Información faltante
    } else {
        try {
            let correo = jwt.verify(req.body.token, process.env.JWT_SECRET).email
            let forma = JSON.parse(JSON.stringify(req.body)) //Clonando de objetos como un campeon
            forma.email = correo
            const options = {
                method: 'PUT',
                url: process.env.URL_PLANTS,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(forma)
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                res.send()
            });
        } catch (error) {
            console.log('------------------------------------');
            console.log(error);
            console.log('------------------------------------');
            res.sendStatus(401)
        }
    }
})

router.route("/timers").post((req, res) => {
    if (["token, endpoint_iot, common_name, countDownDate, plant_id, water, hum_needed, light_needed, freq, soil"].some(e => req.body[e] == "")) {
        res.sendStatus(400) //Información faltante
    } else {
        try {
            let cuerpo = JSON.parse(JSON.stringify(req.body))
            let correo = jwt.verify(req.body.token, process.env.JWT_SECRET).email //Verificar login

            let index = timersArr.findIndex(o => o.plant_id == req.body.plant_id)
            if (index == -1) {//Plantid no encontrado, agregarlo
                index = -1 + timersArr.push({
                    plant_id: req.body.plant_id,
                    interval: ""
                })
            } else {
                clearInterval(timersArr[index].interval);//Borrar el anterior
                console.log('------------------------------------');
                console.log("Borrando Timer");
                console.log('------------------------------------');
            }
            const options = {
                method: 'GET',
                url: process.env.URL_USERS,
                qs: { email: correo }
            };
            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                let phone = JSON.parse(body).phone
                console.log('------------------------------------');
                console.log(body);
                console.log('------------------------------------');
                console.log('------------------------------------');
                console.log("Creando Timer para " + phone);
                console.log('------------------------------------');
                timersArr[index].interval = setInterval(function () {
                    var now = new Date().getTime();
                    var distance = req.body.countDownDate - now;
                    if (distance < 0) {
                        clearInterval(timersArr[index].interval);
                        console.log('------------------------------------');
                        console.log(`Now: ${req.body.common_name}`);
                        console.log('------------------------------------');
                        //Mandar SMS
                        let options;
                        if (req.body.water == "true") {//Automatico
                            options = {
                                method: 'GET',
                                url: process.env.URL_IOT,
                                qs: {
                                    hum: req.body.hum_needed,
                                    light: req.body.light_needed
                                }
                            };
                            request(options, function (error, response, body) {
                                if (error) throw new Error(error);
                                //Mandar mensaje auto
                                options = {
                                    method: 'POST',
                                    url: process.env.URL_SMS,
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Basic ${process.env.SMS_TOKEN}`
                                    },
                                    body: JSON.stringify({
                                        to: phone,
                                        content: `${req.body.common_name} watered. Current light: ${JSON.parse(body).light} lux. Current humidity: ${JSON.parse(body).humidity}`,
                                        from: "PlantEnd"
                                    })
                                };
                                request(options, function (error, response, body) {
                                    if (error) throw new Error(error);
                                    console.log('---------------Body sms auto------------------');
                                    console.log(body);
                                    console.log('------------------------------------');
                                    if (req.body.water == "true") {
                                        console.log('------------------------------------');
                                        console.log("Reacargando timer");
                                        console.log('------------------------------------');
                                        let ms = 24 * 60 * 60 * 1000 / req.body.freq
                                        var now_at_set = new Date().getTime();
                                        var countDownDate = new Date(now_at_set + ms).getTime();
                                        cuerpo.countDownDate = countDownDate

                                        let forma = {
                                            token: req.body.token,
                                            countDownDate: countDownDate,
                                            plant_id: req.body.plant_id,
                                            soil: req.body.soil //Unicamente para evitar un error en la lambda
                                        }
                                        let opti = {
                                            method: 'PUT',
                                            url: process.env.URL_BACK+"/plants",
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify(forma)
                                        };
                                        request(opti, function (error, response, body) {
                                            console.log('----------------Respuesta DB----------------');
                                            console.log(body);
                                            console.log('------------------------------------');
                                            if (error) throw new Error(error);
                                            let opt = {
                                                method: 'POST',
                                                url: process.env.URL_BACK+"/timers",
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify(cuerpo)
                                            };
                                            request(opt, function (error, response, body) {
                                                console.log('----------------Respuesta recarga----------------');
                                                console.log(body);
                                                console.log('------------------------------------');
                                                if (error) throw new Error(error);
                                            });
                                        });
                                    }
                                })
                            });
                        } else {//Manual
                            options = {
                                method: 'POST',
                                url: process.env.URL_SMS,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Basic ${process.env.SMS_TOKEN}`
                                },
                                body: JSON.stringify({
                                    to: phone,
                                    content: `Watering reminder: ${req.body.common_name}`,
                                    from: "PlantEnd"
                                })
                            };
                            request(options, function (error, response, body) {
                                console.log('----------------Body manual----------------');
                                console.log(body);
                                console.log('------------------------------------');
                                if (error) throw new Error(error);
                            });
                        }
                    }
                }, 1000);
                res.send();
            });
        } catch (error) {
            console.log('------------------------------------');
            console.log(error);
            console.log('------------------------------------');
            res.sendStatus(401)
        }
    }
})


router.route("/image").post(upload.single('myFile'), (req, res) => {
    const uploadFile = () => {
        const fileStream = fs.createReadStream(req.file.path);
        const params = {
            Bucket: 'plantendp2w', // pass your bucket name
            Key: `${req.file.filename}`, // file will be saved as testBucket/contacts.csv
            Body: fileStream,
            ACL: 'public-read'
        };
        s3.upload(params, function (s3Err, data) {
            if (s3Err) throw s3Err
            // console.log(`File uploaded successfully at ${data.Location}`)
            // res.json({ path: data.Location })

            //Mandar imagen a apiPlantNet
            const options = {
                method: 'GET',
                url: process.env.URL_API_PLANT_NET,
                qs: { image: data.Location, organ: "leaf" }
            };
            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                //Responder nombre de la planta y url
                res.json({ name: JSON.parse(body).species.scientificNameWithoutAuthor, path: data.Location })
            });


            fs.unlink(req.file.path, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
                //file removed
            })
        });
    };
    uploadFile();
})

module.exports = router;