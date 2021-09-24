const Follow = require("../models/follow");
const user = require("../models/user");
const User = require("../models/user")

async function follow(username, ctx) {
    const userFound= await User.findOne({username});
    if (!userFound) throw new Error("Usuario no encontrado");
    try {
        const follow = new Follow ({
            idUser: ctx.user.id, //id propio
            follow: userFound._id
        });
        follow.save();
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function isFollow(username, ctx) {
    const userFound= await User.findOne({username});
    if (!userFound) throw new Error("Usuario no encontrado");
   
    const follow = await Follow.find({ idUser: ctx.user.id})
        .where("follow")
        .equals(userFound._id);
    
    if(follow.length > 0) {
        return true;
    }
    return false 
}

async function unFollow( username, ctx) {
    const userFound= await User.findOne({username});
   
    const follow = await Follow.deleteOne({ idUser: ctx.user.id})
        .where("follow")
        .equals(userFound._id);

    if(follow.deletedCount > 0 ) {
        return true;
    }
    return false
}

async function getFollowers( username, ctx) {
    const user= await User.findOne({username});
    if (!user) throw new Error("Usuario no encontrado");

    const followers = await Follow.find( {follow: user._id}).populate("idUser"); //populate concatena con User y trae todo
    const followersList = [];

    for await (const data of followers) {
        followersList.push(data.idUser)
    }
    return followersList;
}

async function getFolloweds( username, ctx) {
    const user= await User.findOne({username});
    if (!user) throw new Error("Usuario no encontrado");

    const followeds = await Follow.find( {idUser: user._id}).populate("follow"); //populate concatena con User y trae todo
    const followedsList = [];

    for await (const data of followeds) {
        followedsList.push(data.follow)
    }
    return followedsList;
}

async function getNotFolloweds(ctx) {
    const users = await User.find().limit(50);

    const arrayUsers = [];

    for await (const user of users) {
        const isFind = await Follow.findOne({idUser: ctx.user.id}).where("follow").equals(user._id); //saber si sigo a ese usuario

        if(!isFind) { //si no lo sigo
            if(user._id.toString() !== ctx.user.id.toString()) { //y no soy el mismo user obtenido
                arrayUsers.push(user); //agrego al listado
            }
        }
    }
    return arrayUsers;
}

module.exports = {
    follow,
    isFollow,
    unFollow,
    getFollowers,
    getFolloweds,
    getNotFolloweds,
};