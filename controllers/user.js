const User = require("../models/user");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const awsUploadImage = require("../utils/aws-upload-image");


function createToken(user, SECRET_KEY, expiresIn) {
    const {id, name, email, username} = user;
    const payload = {
        id,
        name,
        email,
        username
    };
    return jwt.sign(payload, SECRET_KEY, { expiresIn});
}

async function register(input) {
    console.log("Registrando User");

    const newUser = input;
    newUser.email = newUser.email.toLowerCase();
    newUser.username = newUser.username.toLowerCase();
    
    const { email, username, password} = newUser;

    //Revisamos si el email esta en uso
    const foundEmail = await User.findOne({email});
    if (foundEmail) throw new Error("El email ya esta en uso");

    //Revisamos si el username esta en uso
    const foundUsername = await User.findOne({username});
    if (foundUsername) throw new Error("El username ya esta en uso");

    //Encriptar password
    const salt = await bcryptjs.genSaltSync(10);
    newUser.password = await bcryptjs.hash(password, salt);

    try {
        const user = new User(newUser);
        user.save();
        return user;
    } catch (error) {
        console.log(error);   
    }
}

async function login(input) {
    const { email, password} =  input;

    //validamos email en BBDD
    const userFound = await User.findOne({email: email.toLowerCase()});
    if (!userFound) throw new Error("Error en el email o contraseña");

    //validamos contraseña
    const passwordSuccess = await bcryptjs.compare(password, userFound.password);
    if (!passwordSuccess) throw new Error("Error en el email o contraseña");

    return {
        token: createToken(userFound, process.env.SECRET_KEY, "24h" )
    }
}

async function getUser(id, username) {
    let user = null;
    if (id) user = await User.findById(id);
    if (username) user = await User.findOne({username});
    if (!user) throw new Error("El usuario no existe");

    return user;
}

async function updateAvatar(file, ctx) {
    const {id} = ctx.user;
    const imageBuffer = decodeBase64Image(file);
    const extension = imageBuffer.type.split("/")[1];
    
    const imageName = `avatar/${id}.${extension}`;
    const fileData = imageBuffer.data;

    try {
        const result = await awsUploadImage(fileData, imageName);//guardamos en el servidor s3 de AWS
        await User.findByIdAndUpdate(id, { avatar: result});//actualizamos avatar en la BBDD
        return {
            "status": true,
            "urlAvatar": result
        };
    } catch (error) {
        console.log(error);
        return {
            "status": false,
            "urlAvatar": null
        };
    }
}

async function deleteAvatar(ctx) {
    const {id} = ctx.user;
    try {
        await User.findByIdAndUpdate(id, {avatar: ""});
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function updateUser(input, ctx) {
    const {id} = ctx.user;
    try {
        if(input.currentPassword && input.newPassword) {
            //Cambiar contraseña
            const userFound = await User.findById(id);
            const passwordSuccess = await bcryptjs.compare(input.currentPassword, userFound.password);
            if (!passwordSuccess) throw new Error("Contraseña incorrecta");

            const salt =  await bcryptjs.genSaltSync(10);
            const newPasswordCrypt = await bcryptjs.hash(input.newPassword, salt);

            await User.findByIdAndUpdate(id, {password: newPasswordCrypt});
        } else {
            //actualiza cualquier otro dato
            await User.findByIdAndUpdate(id, input);
        }
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function search(search){
    const users = await User.find({
        name: { $regex: search, $options: "i"},
    });

    return users;
}

function decodeBase64Image(dataString) 
{ 
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/); 
    var response = {}; 

    if (matches.length !== 3) 
    { 
        return new Error('Invalid input string'); 
    } 

    response.type = matches[1]; 
    response.data = Buffer.from(matches[2], 'base64'); 

    return response; 
} 

module.exports = {
    register,
    login,
    getUser,
    updateAvatar,
    deleteAvatar,
    updateUser,
    search
}