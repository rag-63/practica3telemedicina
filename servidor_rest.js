const path = require('path');

var express = require("express");
var app = express();

// 1. Importar el cliente de Supabase
const { createClient } = require('@supabase/supabase-js');

// 2. Configurar con tu URL y tu Public Key (anon key)
const supabaseUrl = 'https://lwxdcwmnkrjkbjnyxyeu.supabase.co';
const supabaseKey = 'sb_publishable__ThYiCsa8TuXY3HDmQ5Ouw_zyNLEpyg'; // <--- Pega aquí tu public key
const supabase = createClient(supabaseUrl, supabaseKey);
//Antes de esto, instalo npm install jwt-simple
var jwt = require("jwt-simple"); // PRÁCTICA 3 - PARTE 2: librería para crear y leer tokens JWT
var clave = "claveSecretaTelemedicina"; // clave para codificar / decodificar el token

app.use(express.json()); 

// DEJAR EL PATH?
app.use('/cliente_rest', express.static(path.join(__dirname, 'cliente_rest')));
app.use('/cliente_rpc', express.static(path.join(__dirname, 'cliente_rpc')));

// Ruta principal
app.get('/', (req, res) => {
    res.send('¡Servidor REST funcionando!');
});

// 2. Gestión de Gestores
// Login del gestor 
// RUTAS PÚBLICAS (no necesitan token): login y registro de gestores
app.post("/api/gestores/login", function(req,res){
  var usuario = req.body.usuario;
  var password = req.body.password;
  //Cargar la base de datos para comprobar gestor existe
  supabase.from('gestores').select('*').then(function (respuesta) {
        var err = respuesta.error;
        var gestores = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            // Recorrer la base de datos y buscar si usuario y contraseña coincide
            for(let i = 0; i<gestores.length; i++ ){
              if (gestores[i].usuario == usuario && gestores[i].password == password){
                console.log("Login correcto");
                // Crear el token con el id del gestor y la fecha en la que caduca
                var contenido = { //lo que voy a meter dentro del token
                usuario: gestores[i].id, //id del gestor que ha hecho el login
                expira: Date.now() + 60 * 60 * 1000 // caduca dentro de 1 hora (en milisegundos)
                };
                var token = jwt.encode(contenido, clave); //coge el contenido, lo codifica y lo firma con la clave
                return res.status(200).json({ idGestor: gestores[i].id, token: token }) //Login correcto, devuelve id del gestor y el token
              }
            }
            res.status(403).json("Usuario o contraseña erroneos");
        }
    });

})
// Crea un nuevo gestor 

app.post('/api/gestores', function(req, res){
  var usuario = req.body.usuario;
  var existe = false;
  supabase.from('gestores').select('*').then(function (respuesta) {
        var err = respuesta.error;
        var gestores = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            // Recorrer la base de datos y buscar si usuario y contraseña coincide
            for(let i = 0; i<gestores.length; i++ ){
              if (gestores[i].usuario == usuario){
                console.log("Login debe ser único");
                existe = true;
                return res.status(400).json("Usuario ya existe");
              }
            }
            if (existe == false){
              supabase.from('gestores').insert({ nombre: req.body.nombre, apellidos: req.body.apellidos, usuario: req.body.usuario, password: req.body.password }).select().then(function (respuesta2) {
              var err = respuesta2.error;
              var resultado = respuesta2.data;
              if (err) {
                console.log("Error al realizar el insert", err);
                res.status(500).json("Error al realizar la insercion");
              } else {
                  console.log("Gestor insertado:", resultado);
                  res.status(201).json(resultado[0].id);
              }
              });
            }
          }
        });
})

// PRÁCTICA 3 - PARTE 2: COMPROBACIÓN DEL TOKEN es como un portero
// Todas las rutas /api que estén DEBAJO de este app.use necesitan un token válido.
// Si el token no es correcto, se responde con error y no se llega a la ruta.
app.use("/api", function (req, res, next) { //se ejecuta para cualquier peticion que empiece por /api
  var token = req.query.token; // el token viene en la URL: /api/recursos?token=XXXX
  if (!token) {//COMPROBACION 1. Hay token?
    return res.status(401).json("No se ha encontrado token");
  }  

  // Decodificar el token (si alguien lo ha modificado o la clave no coincide, da error)
  try { //COMPROBACION 2. es un token valido?
    var contenidoToken = jwt.decode(token, clave);
  } catch (error) { //captura el error para no petar
    return res.status(401).json("El token es incorrecto");
  }

  // Comprobar que el token tiene el formato que nosotros creamos
  if (!contenidoToken.usuario || !contenidoToken.expira) { //COMPROBACION 3. formato correcto?
    return res.status(401).json("El formato del token no es adecuado");
  }

  // Comprobar que no ha caducado
  if (contenidoToken.expira < Date.now()) {
    return res.status(401).json("El token ha expirado");
  }

  // Todo correcto: next() deja pasar la petición a la ruta que corresponda
  next(); 
});
// RUTAS PRIVADAS (necesitan token)

// 1. Ubicaciones, Categorías y Modelos (obtención de arrays)

app.get("/api/ubicaciones", function(req, res){
  supabase.from('ubicaciones').select('*').then(function (respuesta) {
        var err = respuesta.error;
        var ubicaciones = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Ubicaciones:", ubicaciones);
            res.status(200).json(ubicaciones);
        }
    });
});

app.get("/api/categorias", function(req, res){
  supabase.from('categorias').select('*').then(function (respuesta) {
        var err = respuesta.error;
        var categorias = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Categorias:", categorias);
            res.status(200).json(categorias);
        }
    });
});

app.get("/api/modelos", function(req, res){
  supabase.from('modelos').select('*').then(function (respuesta) {
        var err = respuesta.error;
        var modelos = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Modelos:", modelos);
            res.status(200).json(modelos);
        }
    });
});

app.get("/api/sanitarios", function(req, res){
  supabase.from('sanitarios').select('*').then(function (respuesta) {
        var err = respuesta.error;
        var sanitarios = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Sanitarios:", sanitarios);
            res.status(200).json(sanitarios);
        }
    });
});

app.get("/api/reservas", function(req,res){
    supabase.from('reservas').select('*').then(function (respuesta) {
        var err = respuesta.error;
        var reservas = respuesta.data;
        if (err){
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Reservas:", reservas);
            res.status(200).json(reservas);
        }
    })
})


// Obtener datos del gestor sin contraseña 

app.get("/api/gestores/:id", function (req, res) {
    var idGestor = req.params.id;
    supabase.from('gestores').select('*').eq('id', idGestor).then(function (respuesta) {
        var err = respuesta.error;
        var gestores = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            if (gestores.length === 1) {
                var datosSinPass = {id: gestores[0].id, nombre: gestores[0].nombre, apellidos: gestores[0].apellidos, usuario: gestores[0].usuario};
                console.log("Gestor:", datosSinPass);
                res.status(200).json(datosSinPass);
            } else {
                console.log("No se ha encontrado el gestor con id:", idGestor);
                res.status(404).json("No se ha encontrado el gestor");
            }
        }
    });
});

// Actualiza datos del gestor (excepto id)

app.put("/api/gestores/:id", function(req, res){
  var idGestor = req.params.id;
  var nuevoUsuario = req.body.usuario;

  // 1. Comprobar si otro gestor (con id distinto) ya tiene ese usuario
  supabase.from('gestores').select('*').eq('usuario', nuevoUsuario).neq('id', idGestor).then(function (respuesta) {
    var err = respuesta.error;
    var existentes = respuesta.data;
    if (err) {
      console.log("Error al comprobar el usuario", err);
      return res.status(500).json("Error al realizar la consulta");
    }

    if (existentes.length > 0) {
      console.log("Login debe ser único");
      return res.status(400).json("El usuario ya existe");
    }

    // 2. Si no hay conflicto, hacer el update
    supabase.from('gestores').update({ nombre: req.body.nombre, apellidos: req.body.apellidos, usuario: req.body.usuario, password: req.body.password }).eq('id', idGestor).then(function (respuesta2) {
      var err2 = respuesta2.error;
      if (err2) {
        console.log("Error al realizar el update", err2);
        return res.status(500).json("Error al realizar la actualización");
      }
      return res.status(200).send();
    });
  });
});



// 3. Sanitarios 
// Obtiene objeto con datos sanitario sin codigo acceso
app.get("/api/sanitarios/:id", function(req,res){
  var idSanitario = req.params.id;
    supabase.from('sanitarios').select('*').eq('id', idSanitario).then(function (respuesta) {
        var err = respuesta.error;
        var sanitarios = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            if (sanitarios.length === 1) {
                console.log("Sanitario:", sanitarios[0]);
                var datosSinPass = {id: idSanitario, nombre: sanitarios[0].nombre, apellidos: sanitarios[0].apellidos, usuario: sanitarios[0].usuario};
                res.status(200).json(datosSinPass); 
            } else {
                console.log("No se ha encontrado el sanitario con id:", idSanitario);
                res.status(404).json("No se ha encontrado el sanitario");
            }
        }
    });
})



// 4. Gestión de Recursos
// Obtener todos los recursos: cat, mod, ubi, estado
app.get("/api/recursos", function (req, res) {
    var consulta = supabase.from('recursos').select('*');

    if (req.query.categoria && req.query.categoria !== "Todos") {
        // la categoría está en la tabla modelos: unimos recursos con su modelo y filtramos por su categoría
        consulta = supabase.from('recursos').select('*, modelos!inner(categoria)').eq('modelos.categoria', req.query.categoria);
    }
    if (req.query.modelo && req.query.modelo !== "Todos") {
        consulta = consulta.eq('modelo', req.query.modelo);
    }
    if (req.query.ubicacion && req.query.ubicacion !== "Todos") {
        consulta = consulta.eq('ubicacion', req.query.ubicacion);
    }
    if (req.query.estado && req.query.estado !== "Todos") {
        consulta = consulta.eq('estado', req.query.estado);
    }

    consulta.then(function (respuesta) {
        var err = respuesta.error;
        var recursos = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            console.log("Recursos:", recursos);
            res.status(200).json(recursos);
        }
    });
});

// Obtiene datos de un recurso 
app.get("/api/recursos/:id", function (req, res) {
    var idRecursos = req.params.id;
    supabase.from('recursos').select('*').eq('id', idRecursos).then(function (respuesta) {
        var err = respuesta.error;
        var recursos = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            if (recursos.length === 1) {
                console.log("Recursos:", recursos[0]);
                res.status(200).json(recursos[0]);
            } else {
                console.log("No se ha encontrado el recurso con id:", idRecursos);
                res.status(404).json("No se ha encontrado el recurso");
            }
        }
    });
});

// Crea un recurso 
app.post("/api/recursos", function (req, res){
  supabase.from('recursos').insert({ modelo: req.body.modelo, ubicacion: req.body.ubicacion, numero_serie: req.body.numero_serie, estado: req.body.estado }).select().then(function (respuesta) {
        var err = respuesta.error;
        var resultado = respuesta.data;
        if (err) {
            console.log("Error al realizar el insert", err);
            res.status(500).json("Error al realizar la insercion");
        } else {
            // Queremos que devuelva el recurso entero junto con el nuevo id
            supabase.from('recursos').select('*').eq('id', resultado[0].id).then(function (respuesta2) {
              var error = respuesta2.error;
              var recursoCreado = respuesta2.data;
              if (error) {
                  console.log("Error al realizar la select", error);
                  res.status(500).json("Error al realizar la consulta");
              } else {
                  console.log("Recursos:", recursoCreado[0]);
                  res.status(200).json(recursoCreado[0]);
              }
          });
        }
    });
})

// Actualizar

app.put("/api/recursos/:id", function (req, res) {
    supabase.from('recursos').update({ modelo: req.body.modelo, ubicacion: req.body.ubicacion, numero_serie: req.body.numero_serie, estado: req.body.estado }).eq('id', req.params.id).then(function (respuesta) {
        var err = respuesta.error;
        var resultado = respuesta.data;
        if (err) {
            console.log("Error al realizar el update", err);
            res.status(500).json("Error al realizar la actualización");
        } else {
            console.log("Recurso actualizado:", resultado);
            res.status(200).json("Recurso actualizado");
        }
    });
});

// Borra un recurso

app.delete("/api/recursos/:id", function (req, res) {
    supabase.from('recursos').delete().eq('id', req.params.id).then(function (respuesta) {
        var err = respuesta.error;
        var resultado = respuesta.data;
        if (err) {
            console.log("Error al realizar el delete", err);
            res.status(500).json("Error al realizar el borrado");
        } else {
            console.log("Recurso borrado:", resultado);
            res.status(200).json("Recurso eliminado");
        }
    });
});


// 5. Reservas y Reseñas 
// Obtiene las RESERVAS de un recurso
app.get("/api/recursos/:id/reservas", function (req, res) {
    var idRecurso = req.params.id;
    supabase.from('reservas').select('*').eq('recurso', idRecurso).then(function (respuesta) {
        var err = respuesta.error;
        var reservas = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al obtener las reservas");
        } else {
            console.log("Reservas:", reservas);
            res.status(200).json(reservas);
        }
    });
});

// Obtiene las RESEÑAS de un recurso
app.get("/api/recursos/:id/resenyas", function(req, res){
  var idRecurso = req.params.id;
    supabase.from('resenyas').select('*').eq('recurso', idRecurso).then(function (respuesta) {
        var err = respuesta.error;
        var resenyas = respuesta.data;
        if (err) {
            console.log("Error al realizar la select", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            if (resenyas.length > 0) {
                console.log("Reseñas:", resenyas);
                res.status(200).json(resenyas); 
            } else {
                console.log("No se han encontrado reseñas para el recurso con id:", idRecurso);
                res.status(404).json("No se han encontrado reseñas para el recurso");
            }
        }
    });
})

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Gestión Hospitalaria ejecutándose en http://localhost:${PORT}`);
});
