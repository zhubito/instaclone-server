const mongoose = require("mongoose");
const {ApolloServer} = require("apollo-server");
const typeDefs = require("./gql/schema");
const resolvers = require("./gql/resolver");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: ".env"});

mongoose.connect(
    process.env.BBDD, 
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        //useFindAndModify: true, /* opciones no soportadas */
        //useCreateIndex: true
    }, (err, _)=> { //deberia ser (err, res), pero res no usamos por lo que por buenas practicas se deja el _
    if(err) {
        console.log("Error de conexion");
    } else {
        server();
    }
});

function server() {
    const serverApollo = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({req}) => {
            const token = req.headers.authorization; //se suele agregar en prod se euele agregar bearer o token al inicio
            
            if(token) {
                try {
                    const user = jwt.verify(
                        token.replace("Bearer ", ""),
                        process.env.SECRET_KEY
                    );
                    return {
                        user,
                    };
                } catch (error) {
                    console.log("#### ERROR ####");
                    console.log(error);
                    throw new Error("Token invalido");
                }
            }
        }
    });

    serverApollo.listen({port: process.env.PORT || 4000}).then(({ url }) => {
        console.log("###################################");
        console.log(`Servidor listo en la url ${url}`);
        console.log("###################################");
    });
}