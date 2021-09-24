const Publication = require("../models/publication");
const User = require("../models/user");
const Follow = require("../models/follow");
const awsUploadImage = require("../utils/aws-upload-image");
const { v4: uuidv4 } = require("uuid");

async function publish(file, ctx) {
  const {id} = ctx.user;
  const imageBuffer = decodeBase64Image(file);
  const extension = imageBuffer.type.split("/")[1];
  
  const fileData = imageBuffer.data;
  const fileName = `publication/${uuidv4()}.${extension}`;

  try {
    const result = await awsUploadImage(fileData, fileName);
    const publication = new Publication({
      idUser: id,
      file: result,
      typeFile: imageBuffer.type .split("/")[0],
      createAt: Date.now(),
    });
    publication.save();

    return {
      status: true,
      urlFile: result,
    };
  } catch (error) {
    return {
      status: null,
      urlFile: "",
    };
  }
}

async function getPublications(username) {
  const user = await User.findOne({username});

  if(!user) throw new Error("Usuario no encontrado");
  
  const publications = await Publication.find()
    .where({ idUser: user._id})
    .sort({ createAt: -1}) //ordena del mas nuevo al mas viejo
  
  return publications;
}

async function getPublicationsFolloweds(ctx) {
  const followeds = await Follow.find({idUser: ctx.user.id}).populate("follow");

  const followedsList = [];
  for await (const data of followeds) {
    followedsList.push(data.follow);
  }

  const publicationList = [];
  for await (const data of followedsList) {
    const publications = await Publication.find()
      .where({idUser: data._id})
      .sort({ createAt: -1})
      .populate("idUser");
    
    publicationList.push(...publications); // solo inserta los objetos sin el array
  }
  
  const result = publicationList.sort((a, b) => { //ordenamos las publicaciones
    return new Date(b.createAt) - new Date(a.createAt);
  });
  return result;
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
  publish,
  getPublications,
  getPublicationsFolloweds,
};