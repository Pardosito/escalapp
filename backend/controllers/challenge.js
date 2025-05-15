import { getDatabase } from './configdb.js';
import { ObjectId } from 'mongodb';
import { Challenge } from '../models/Challenge.js';
import fs from 'fs';
import path from 'path';


const CHALLENGES_COLLECTION = 'challenges';
const CHALLENGE_PARTICIPANTS_COLLECTION = 'challengeparticipants';


const imagesBaseDir = path.join(process.cwd(), 'images'); // Directorio base para todas las imágenes


const findChallenges = async (query = {}, options = {}) => {
  try {
    const db = getDatabase();
    const challengesCollection = db.collection(CHALLENGES_COLLECTION);

    let cursor = challengesCollection.find(query);

    if (options.sort) {
      cursor = cursor.sort(options.sort);
    }
    if (options.skip) {
      cursor = cursor.skip(options.skip);
    }
    if (options.limit) {
      cursor = cursor.limit(options.limit);
       }
       if (options.projection) {
        cursor = cursor.project(options.projection);
      }

    const challenges = await cursor.toArray();

    return challenges;

  } catch (error) {
    console.error('Error in findChallenges (DB logic):', error);
    throw error;
  }
};

const createChallengeDB = async (challengeDocument) => {
    try {
        const db = getDatabase();
        const challengesCollection = db.collection(CHALLENGES_COLLECTION);

        const result = await challengesCollection.insertOne(challengeDocument);

        if (result.acknowledged) {
            return { insertedId: result.insertedId, acknowledged: true };
        } else {
            console.error('Database insertion not acknowledged for new challenge:', challengeDocument);
            throw new Error('Challenge insertion not acknowledged by database.');
        }

    } catch (error) {
        console.error('Error in createChallengeDB:', error);
        throw error;
    }
};

const findChallengeByIdDB = async (challengeId) => {
    try {
        const db = getDatabase();
        const challengesCollection = db.collection(CHALLENGES_COLLECTION);
        const objectId = new ObjectId(challengeId);
        const challenge = await challengesCollection.findOne({ _id: objectId });
        return challenge;
    } catch (error) {
        console.error('Error in findChallengeByIdDB:', error);
        if (error.message.includes('ObjectId')) {
            return null;
        }
        throw error;
    }
};

const updateChallengeDB = async (challengeId, updateOperators) => {
    try {
        const db = getDatabase();
        const challengesCollection = db.collection(CHALLENGES_COLLECTION);

        const objectId = new ObjectId(challengeId);

        const result = await challengesCollection.updateOne(
            { _id: objectId },
            updateOperators
        );

        return result.modifiedCount;

    } catch (error) {
        console.error('Error in updateChallengeDB:', error);
        throw error;
    }
};

const deleteChallengeDB = async (challengeId) => {
    try {
        const db = getDatabase();
        const challengesCollection = db.collection(CHALLENGES_COLLECTION);
        const challengeParticipantsCollection = db.collection(CHALLENGE_PARTICIPANTS_COLLECTION);


        const objectId = new ObjectId(challengeId);

        // Eliminar primero los participantes asociados
        await challengeParticipantsCollection.deleteMany({ challengeId: objectId });

        // Luego eliminar el reto
        const result = await challengesCollection.deleteOne({ _id: objectId });
        return result.deletedCount;
    } catch (error) {
        console.error('Error in deleteChallengeDB:', error);
        throw error;
    }
};

const registerUserForChallengeDB = async (challengeId, userId) => {
    try {
        const db = getDatabase();
        const challengesCollection = db.collection(CHALLENGES_COLLECTION);
        const challengeParticipantsCollection = db.collection(CHALLENGE_PARTICIPANTS_COLLECTION);

        const challengeObjectId = new ObjectId(challengeId);
        const userObjectId = new ObjectId(userId);

        // 1. Obtener el reto para verificar estado y límite
        const challenge = await challengesCollection.findOne({ _id: challengeObjectId });

        if (!challenge) {
            return { status: 'notfound', message: 'Challenge not found.' };
        }

        if (challenge.status !== 'open') {
            return { status: 'forbidden', message: 'Challenge is not open for registration.' };
        }

        if (challenge.maxParticipants !== null && challenge.currentParticipants >= challenge.maxParticipants) {
            return { status: 'forbidden', message: 'Challenge is already full.' };
        }

        // 2. Verificar si el usuario ya está inscrito
        const alreadyRegistered = await challengeParticipantsCollection.findOne({
            challengeId: challengeObjectId,
            userId: userObjectId
        });

        if (alreadyRegistered) {
            return { status: 'conflict', message: 'User is already registered for this challenge.' };
        }

        // 3. Registrar al usuario en la colección de participantes
        const insertionResult = await challengeParticipantsCollection.insertOne({
            challengeId: challengeObjectId,
            userId: userObjectId,
            registeredAt: new Date()
        });

        if (!insertionResult.acknowledged) {
             console.error('Database insertion not acknowledged for challenge participant:', { challengeId, userId });
             throw new Error('Participant registration not acknowledged by database.');
        }

        // 4. Incrementar el contador de participantes en el documento del reto
        const updateResult = await challengesCollection.updateOne(
            { _id: challengeObjectId },
            { $inc: { currentParticipants: 1 } }
        );

         if (updateResult.modifiedCount !== 1) {
              // Esto es un caso de error raro si la inserción del participante fue exitosa pero el contador no se actualizó
               console.error('Challenge participant counter not updated:', { challengeId, userId });
               // Considerar aquí una lógica de compensación o alerta
         }


        return { status: 'success', message: 'User registered successfully.' };

    } catch (error) {
        console.error('Error in registerUserForChallengeDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid challenge or user ID format.');
         }
        throw error;
    }
};

const unregisterUserForChallengeDB = async (challengeId, userId) => {
     try {
        const db = getDatabase();
        const challengesCollection = db.collection(CHALLENGES_COLLECTION);
        const challengeParticipantsCollection = db.collection(CHALLENGE_PARTICIPANTS_COLLECTION);

        const challengeObjectId = new ObjectId(challengeId);
        const userObjectId = new ObjectId(userId);

        // 1. Obtener el reto para verificar estado
        const challenge = await challengesCollection.findOne({ _id: challengeObjectId });

        if (!challenge) {
            return { status: 'notfound', message: 'Challenge not found.' };
        }

        if (challenge.status !== 'open') {
            return { status: 'forbidden', message: 'Challenge is not open for unregistration.' };
        }

        // 2. Eliminar al usuario de la colección de participantes
        const deleteResult = await challengeParticipantsCollection.deleteOne({
            challengeId: challengeObjectId,
            userId: userObjectId
        });

        if (deleteResult.deletedCount === 0) {
            return { status: 'notfound', message: 'User was not registered for this challenge.' };
        }


        // 3. Decrementar el contador de participantes en el documento del reto
         const updateResult = await challengesCollection.updateOne(
            { _id: challengeObjectId },
            { $inc: { currentParticipants: -1 } }
        );

         if (updateResult.modifiedCount !== 1) {
              // Caso de error raro si el participante fue eliminado pero el contador no se decrementó
               console.error('Challenge participant counter not decremented:', { challengeId, userId });
               // Lógica de compensación o alerta
         }


        return { status: 'success', message: 'User unregistered successfully.' };


    } catch (error) {
        console.error('Error in unregisterUserForChallengeDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid challenge or user ID format.');
         }
        throw error;
    }
};


const findChallengeParticipantsDB = async (challengeId) => {
    try {
        const db = getDatabase();
        const challengeParticipantsCollection = db.collection(CHALLENGE_PARTICIPANTS_COLLECTION);
        const usersCollection = db.collection('users'); // Asume que tienes una colección de usuarios llamada 'users'


        const challengeObjectId = new ObjectId(challengeId);

        // Usar Aggregation para obtener participantes y "poblar" info básica del usuario
        const participants = await challengeParticipantsCollection.aggregate([
            { $match: { challengeId: challengeObjectId } },
            {
                $lookup: {
                    from: 'users', // La colección a unir
                    localField: 'userId', // Campo en challengeparticipants
                    foreignField: '_id', // Campo en users
                    as: 'userInfo' // Nombre del array de salida
                }
            },
            {
                $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } // Desestructurar el array userInfo
            },
            {
                $project: {
                    _id: 0, // No incluir el _id del documento de participante
                    userId: '$userId',
                    registeredAt: '$registeredAt',
                    user: { // Crear un objeto con info del usuario
                        _id: '$userInfo._id',
                        username: '$userInfo.username', // Incluir campos de usuario que necesites
                        avatarUrl: '$userInfo.avatarUrl', // Ejemplo
                        // ...
                    }
                }
            }
        ]).toArray();

        return participants;

    } catch (error) {
        console.error('Error in findChallengeParticipantsDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid challenge ID format.');
         }
        throw error;
    }
};

const findUserChallengesDB = async (userId) => {
    try {
        const db = getDatabase();
        const challengeParticipantsCollection = db.collection(CHALLENGE_PARTICIPANTS_COLLECTION);
        const challengesCollection = db.collection(CHALLENGES_COLLECTION);

        const userObjectId = new ObjectId(userId);

        // Usar Aggregation:
        // 1. Encontrar las entradas de participación del usuario
        // 2. Unir con la colección de retos para obtener los detalles de los retos
        const userChallenges = await challengeParticipantsCollection.aggregate([
            { $match: { userId: userObjectId } },
            {
                $lookup: {
                    from: CHALLENGES_COLLECTION,
                    localField: 'challengeId',
                    foreignField: '_id',
                    as: 'challengeInfo'
                }
            },
            {
                 // $unwind puede fallar si el reto ya no existe (challengeInfo es array vacío)
                 // preserveNullAndEmptyArrays: true asegura que el documento original se mantenga
                $unwind: { path: '$challengeInfo', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    _id: '$challengeId', // Proyectar el ID del reto como _id principal
                    registeredAt: '$registeredAt', // Incluir la fecha de registro
                    challenge: '$challengeInfo' // Incluir el objeto reto completo (o campos específicos)
                }
            }
        ]).toArray();

        // Puedes querer limpiar los retos donde challengeInfo es null si el reto asociado no se encontró
         const filteredUserChallenges = userChallenges.filter(item => item.challenge !== null);


        return filteredUserChallenges;


    } catch (error) {
        console.error('Error in findUserChallengesDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user ID format.');
         }
        throw error;
    }
};


// Controlador para manejar la petición POST para crear un reto
// Asume verifyJWT corrió antes
// Asume que el middleware de subida de archivo para retos corrió antes (req.file)
export const createChallenge = async (req, res) => {
    try {
        const creatorId = req.user.userId;

        // Datos del reto desde el cuerpo de la petición
        const {
            title,
            description,
            startDate,
            endDate,
            maxParticipants,
        } = req.body;

        // Información del archivo subido (asume Multer single('image') ya corrió)
        const challengeImageFile = req.file; // Multer single pone la info aquí


        // Validar campos obligatorios
        if (!title || !description || !startDate || !endDate || !challengeImageFile) {
             // Si falta el archivo pero Multer lo guardó, hay que borrarlo (complejo)
             if (challengeImageFile) fs.promises.unlink(challengeImageFile.path).catch(err => console.error('Error cleaning up file after validation error:', err));
            return res.status(400).json({ message: 'Missing required challenge fields (title, description, startDate, endDate, image file).' });
        }

        // Validar formatos y lógicas de fechas/números
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        const parsedMaxParticipants = maxParticipants !== undefined ? parseInt(maxParticipants) : null;

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
             if (challengeImageFile) fs.promises.unlink(challengeImageFile.path).catch(err => console.error('Error cleaning up file after date parsing error:', err));
             return res.status(400).json({ message: 'Invalid date format for startDate or endDate.' });
        }
        if (parsedStartDate >= parsedEndDate) {
             if (challengeImageFile) fs.promises.unlink(challengeImageFile.path).catch(err => console.error('Error cleaning up file after date logic error:', err));
             return res.status(400).json({ message: 'startDate must be before endDate.' });
        }

         if (parsedMaxParticipants !== null && (isNaN(parsedMaxParticipants) || parsedMaxParticipants < 0 || !Number.isInteger(parsedMaxParticipants))) {
             if (challengeImageFile) fs.promises.unlink(challengeImageFile.path).catch(err => console.error('Error cleaning up file after maxParticipants error:', err));
              return res.status(400).json({ message: 'maxParticipants must be a non-negative integer or empty/null for unlimited.' });
         }


        // La ruta donde Multer guardó el archivo (configurado en el middleware de subida)
        // Queremos guardar la ruta relativa desde imagesBaseDir
        const imagePathToStore = path.relative(imagesBaseDir, challengeImageFile.path);


        // Crear el objeto de datos para el nuevo reto
        const newChallengeData = {
            title,
            description,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            maxParticipants: parsedMaxParticipants,
            image: imagePathToStore, // Guardamos la ruta relativa de la imagen
            creatorId: new ObjectId(creatorId),
            // currentParticipants y status se inicializan por defecto en la clase Challenge
        };

        // Llamar a la lógica interna de guardado en la DB
        const insertionResult = await createChallengeDB(newChallengeData);

        if (insertionResult && insertionResult.acknowledged) {
            res.status(201).json({
                message: 'Challenge created successfully.',
                challengeId: insertionResult.insertedId,
            });
        } else {
             console.error('Challenge creation failed: DB did not acknowledge insertion.');
              if (challengeImageFile) fs.promises.unlink(challengeImageFile.path).catch(err => console.error('Error cleaning up file after DB error:', err));
             res.status(500).json({ message: 'Challenge creation failed due to database issue.' });
        }

    } catch (error) {
        console.error('Error in createChallenge controller:', error);
         if (req.file) fs.promises.unlink(req.file.path).catch(err => console.error('Error cleaning up file on controller error:', err));
        res.status(500).json({ message: 'Internal server error during challenge creation.' });
    }
};


// Controlador para manejar la petición GET para obtener retos paginados
export const getChallenges = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'startDate'; // Ordenar por fecha de inicio por defecto

    const skip = (page - 1) * limit;

    let sortOptions = {};
    if (sort === 'recent') { // Opcional: ordenar por fecha de creación
        sortOptions = { createdAt: -1 };
    } else if (sort === 'popular') { // Opcional: ordenar por participantes actuales
        sortOptions = { currentParticipants: -1, startDate: 1 }; // Más participantes, desempate por fecha de inicio ascendente
    }
    else { // startDate o cualquier otro valor
      sortOptions = { startDate: 1, createdAt: -1 }; // Por fecha de inicio ascendente
    }

    // Proyección mínima para la lista
    const projectionOptions = {
      _id: 1,
      title: 1,
      image: 1,
      startDate: 1,
      endDate: 1,
      maxParticipants: 1,
      currentParticipants: 1,
      status: 1,
      creatorId: 1,
    };

    const challenges = await findChallenges(
      {}, // Sin filtro por ahora (ej. por status, por creador, etc.)
      {
        sort: sortOptions,
        skip: skip,
        limit: limit,
        projection: projectionOptions,
      }
    );

    res.status(200).json(challenges);

  } catch (error) {
    console.error('Error in getChallenges controller:', error);
    res.status(500).json({ message: 'Internal server error fetching challenges.' });
  }
};

// Controlador para manejar la petición GET para obtener un reto por ID
export const getChallengeById = async (req, res) => {
    try {
        const challengeId = req.params.id;

        if (!ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID format.' });
        }

        const challenge = await findChallengeByIdDB(challengeId);

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found.' });
        }

        res.status(200).json(challenge);

    } catch (error) {
        console.error('Error in getChallengeById controller:', error);
        res.status(500).json({ message: 'Internal server error fetching challenge.' });
    }
};

// Controlador para manejar la petición PATCH para actualizar un reto (solo campos limitados)
// Asume verifyJWT corrió antes
// Asume que el middleware de subida de archivo para retos corrió antes (req.file si se sube nueva imagen)
export const updateChallenge = async (req, res) => {
    try {
        const challengeId = req.params.id;

        if (!ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID format.' });
        }

        const authenticatedUserId = req.user.userId;

        // 1. Buscar el reto existente
        const challengeToUpdate = await findChallengeByIdDB(challengeId);

        if (!challengeToUpdate) {
            return res.status(404).json({ message: 'Challenge not found.' });
        }

        // 2. Verificar si el usuario autenticado es el creador
        if (challengeToUpdate.creatorId.toString() !== new ObjectId(authenticatedUserId).toString()) {
            return res.status(403).json({ message: 'Forbidden: Only the creator can edit this challenge.' });
        }

        // 3. Preparar los operadores de actualización - SOLO CAMPOS PERMITIDOS
        const updateOperators = {};
        const setOperator = {};
        const unsetOperator = {}; // Para eliminar la imagen si se quita

        // Campos permitidos en el body
        const {
            startDate,
            endDate,
            maxParticipants,
        } = req.body;

        // Validar y añadir al $set solo si están presentes y son válidos
        if (startDate !== undefined) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                 return res.status(400).json({ message: 'Invalid date format for startDate.' });
            }
             setOperator.startDate = parsedStartDate;
        }

        if (endDate !== undefined) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                 return res.status(400).json({ message: 'Invalid date format for endDate.' });
            }
             setOperator.endDate = parsedEndDate;
        }

         // Validar lógica de fechas si ambas están presentes en el body o si una de ellas es actualizada
         // y la otra ya existía en el documento
         const finalStartDate = setOperator.startDate || challengeToUpdate.startDate;
         const finalEndDate = setOperator.endDate || challengeToUpdate.endDate;

        if (finalStartDate && finalEndDate && finalStartDate >= finalEndDate) {
             return res.status(400).json({ message: 'startDate must be before endDate.' });
        }


        if (maxParticipants !== undefined) {
             const parsedMaxParticipants = maxParticipants === null || maxParticipants === '' ? null : parseInt(maxParticipants);

             if (parsedMaxParticipants !== null && (isNaN(parsedMaxParticipants) || parsedMaxParticipants < 0 || !Number.isInteger(parsedMaxParticipants))) {
                 return res.status(400).json({ message: 'maxParticipants must be a non-negative integer or null/empty for unlimited.' });
             }
             // Opcional: Validar que el nuevo maxParticipants no sea menor que currentParticipants
             if (parsedMaxParticipants !== null && parsedMaxParticipants < challengeToUpdate.currentParticipants) {
                  return res.status(400).json({ message: `maxParticipants cannot be less than the current number of participants (${challengeToUpdate.currentParticipants}).` });
             }

             setOperator.maxParticipants = parsedMaxParticipants;
        }

        // Manejo de la imagen: Puede venir una nueva (req.file) o indicarse eliminar la existente
        const newChallengeImageFile = req.file; // Multer single('image')
        const deleteExistingImage = req.body.deleteExistingImage === 'true'; // Asume que el body puede tener este campo

        if (newChallengeImageFile) {
            // Si hay una nueva imagen subida, la establecemos y planeamos borrar la antigua si existía
            const newImagePathToStore = path.relative(imagesBaseDir, newChallengeImageFile.path); // Guarda la ruta relativa
            setOperator.image = newImagePathToStore;

             // Si existía una imagen antigua, planear borrarla DESPUÉS de la actualización de la DB
             if (challengeToUpdate.image) {
                 const oldImagePhysicalPath = path.join(imagesBaseDir, challengeToUpdate.image); // Reconstruye la ruta física
                 fs.promises.unlink(oldImagePhysicalPath).catch(err => {
                     console.error('Error deleting old challenge image:', oldImagePhysicalPath, err);
                 });
            }
        } else if (deleteExistingImage && challengeToUpdate.image) {
            // Si se indica eliminar la imagen existente y había una
            unsetOperator.image = ""; // Usar $unset para eliminar el campo 'image' en DB
             // Planear borrar la imagen física antigua
             const oldImagePhysicalPath = path.join(imagesBaseDir, challengeToUpdate.image); // Reconstruye la ruta física
             fs.promises.unlink(oldImagePhysicalPath).catch(err => {
                 console.error('Error deleting challenge image marked for deletion:', oldImagePhysicalPath, err);
             });
        }
        // Si no hay nueva imagen ni indicación de borrar, la propiedad 'image' no cambia


        // Combinar operadores si tienen contenido
        if (Object.keys(setOperator).length > 0) {
            updateOperators.$set = setOperator;
        }
        if (Object.keys(unsetOperator).length > 0) {
            updateOperators.$unset = unsetOperator;
        }


        // Si no hay operadores de actualización, no hay nada que actualizar
        if (Object.keys(updateOperators).length === 0) {
             // Si había una nueva imagen subida pero no se usó en la DB, esa imagen es huérfana.
             // Necesitamos borrarla.
             if (newChallengeImageFile) {
                 const newImagePhysicalPath = newChallengeImageFile.path || newChallengeImageFile.location; // Esta sí es la ruta física completa de Multer
                  fs.promises.unlink(newImagePhysicalPath).catch(err => {
                       console.error('Error deleting unused uploaded new image:', newImagePhysicalPath, err);
                  });
             }
             return res.status(200).json({ message: 'No updatable fields or new image provided.' });
        }


        // 4. Llamar a la lógica interna de actualización en la DB
        const modifiedCount = await updateChallengeDB(challengeId, updateOperators);

        // 5. Verificar el resultado de la actualización
        if (modifiedCount === 1) {
            res.status(200).json({ message: 'Challenge updated successfully.' });
        } else {
             // Esto puede pasar si el reto fue encontrado pero los operadores no causaron ningún cambio real en la DB
             console.error('Challenge update in DB resulted in unexpected modifiedCount:', modifiedCount, 'for challenge ID:', challengeId);
             res.status(200).json({ message: 'Challenge found, but no changes were made or update failed.' });
        }

    } catch (error) {
        console.error('Error in updateChallenge controller:', error);
         // Si el error ocurrió DESPUÉS de subir una nueva imagen, esa imagen es huérfana.
         if (req.file) {
              const orphanedImagePhysicalPath = req.file.path;
              fs.promises.unlink(orphanedImagePhysicalPath).catch(cleanupErr => {
                   console.error('Error cleaning up orphaned uploaded image after controller error:', orphanedImagePhysicalPath, cleanupErr);
              });
         }
        res.status(500).json({ message: 'Internal server error during challenge update.' });
    }
};


// Controlador para manejar la petición DELETE para eliminar un reto
// Asume verifyJWT corrió antes
export const deleteChallenge = async (req, res) => {
    try {
        const challengeId = req.params.id;

        if (!ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID format.' });
        }

        const authenticatedUserId = req.user.userId;

        // 1. Buscar el reto existente
        const challengeToDelete = await findChallengeByIdDB(challengeId);

        if (!challengeToDelete) {
            return res.status(404).json({ message: 'Challenge not found.' });
        }

        // 2. Verificar si el usuario autenticado es el creador
        if (challengeToDelete.creatorId.toString() !== new ObjectId(authenticatedUserId).toString()) {
            return res.status(403).json({ message: 'Forbidden: Only the creator can delete this challenge.' });
        }

        // 3. Si el usuario es el creador, proceder a eliminar el archivo físico de la imagen
        if (challengeToDelete.image) {
             const imagePhysicalPath = path.join(imagesBaseDir, challengeToDelete.image); // Reconstruye la ruta física
             fs.promises.unlink(imagePhysicalPath).catch(err => {
                 console.error('Error deleting challenge image during delete:', imagePhysicalPath, err);
             });
        }

        // 4. Eliminar el documento del reto y sus participantes de la base de datos
        const deletedCount = await deleteChallengeDB(challengeId);

        // 5. Verificar si el documento fue eliminado en la DB (solo verificamos el reto principal)
        if (deletedCount === 1) {
            res.status(200).json({ message: 'Challenge deleted successfully.' });
        } else {
             console.error('Challenge delete in DB failed, document not found after initial find:', challengeId);
             res.status(500).json({ message: 'Challenge deletion failed in database.' });
        }

    } catch (error) {
        console.error('Error in deleteChallenge controller:', error);
        res.status(500).json({ message: 'Internal server error during challenge deletion.' });
    }
};

// Controlador para manejar la petición POST para inscribirse a un reto
// Asume verifyJWT corrió antes
export const registerForChallenge = async (req, res) => {
    try {
        const challengeId = req.params.id;
        const userId = req.user.userId;

         if (!ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID format.' });
        }
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const result = await registerUserForChallengeDB(challengeId, userId);

        if (result.status === 'success') {
            res.status(200).json({ message: result.message });
        } else if (result.status === 'notfound') {
            res.status(404).json({ message: result.message });
        } else if (result.status === 'forbidden') {
            res.status(403).json({ message: result.message });
        } else if (result.status === 'conflict') {
             res.status(409).json({ message: result.message });
        } else {
             console.error('Unexpected result status from registerUserForChallengeDB:', result);
             res.status(500).json({ message: 'Internal server error during registration.' });
        }

    } catch (error) {
        console.error('Error in registerForChallenge controller:', error);
         if (error.message.includes('Invalid challenge or user ID format.')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during registration operation.' });
    }
};

// Controlador para manejar la petición POST para desinscribirse de un reto
// Asume verifyJWT corrió antes
export const unregisterFromChallenge = async (req, res) => {
     try {
        const challengeId = req.params.id;
        const userId = req.user.userId;

         if (!ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID format.' });
        }
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const result = await unregisterUserForChallengeDB(challengeId, userId);

        if (result.status === 'success') {
            res.status(200).json({ message: result.message });
        } else if (result.status === 'notfound') {
            res.status(404).json({ message: result.message });
        } else if (result.status === 'forbidden') {
            res.status(403).json({ message: result.message });
        } else {
             console.error('Unexpected result status from unregisterFromChallenge:', result);
             res.status(500).json({ message: 'Internal server error during unregistration.' });
        }

    } catch (error) {
        console.error('Error in unregisterFromChallenge controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during unregistration operation.' });
    }
};

// Controlador para obtener la lista de participantes de un reto
export const getChallengeParticipants = async (req, res) => {
    try {
        const challengeId = req.params.id;

         if (!ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID format.' });
        }

        // Opcional: Verificar si el reto existe, aunque findChallengeParticipantsDB devolverá vacío si no existe
        const challengeExists = await findChallengeByIdDB(challengeId);
        if (!challengeExists) {
             return res.status(404).json({ message: 'Challenge not found.' });
        }


        const participants = await findChallengeParticipantsDB(challengeId);

        res.status(200).json(participants);

    } catch (error) {
        console.error('Error in getChallengeParticipants controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching participants.' });
    }
};


// Controlador para obtener la lista de retos en los que el usuario autenticado está inscrito
// Asume verifyJWT corrió antes
export const getUserChallenges = async (req, res) => {
    try {
        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const userChallenges = await findUserChallengesDB(userId);

        res.status(200).json(userChallenges);

    } catch (error) {
        console.error('Error in getUserChallenges controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(401).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching user challenges.' });
    }
};



 