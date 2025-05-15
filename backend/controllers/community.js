import { getDatabase } from './configdb.js';
import { ObjectId } from 'mongodb';
import { Community } from '../models/Community.js';
import fs from 'fs';
import path from 'path';


const COMMUNITIES_COLLECTION = 'communities';


const imagesBaseDir = path.join(process.cwd(), 'images');


const findCommunities = async (query = {}, options = {}) => {
  try {
    const db = getDatabase();
    const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);

    let cursor = communitiesCollection.find(query);

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

    const communities = await cursor.toArray();

    return communities;

  } catch (error) {
    console.error('Error in findCommunities (DB logic):', error);
    throw error;
  }
};

const createCommunityDB = async (communityDocument) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);

        // Opcional: Asegurar que el nombre de la comunidad sea único
        // Podrías añadir un índice único en la colección o hacer una verificación aquí
        const existingCommunity = await communitiesCollection.findOne({ name: communityDocument.name });
        if (existingCommunity) {
             return { acknowledged: false, message: 'Community name already exists.' };
        }


        const result = await communitiesCollection.insertOne(communityDocument);

        if (result.acknowledged) {
            return { insertedId: result.insertedId, acknowledged: true };
        } else {
            console.error('Database insertion not acknowledged for new community:', communityDocument);
            throw new Error('Community insertion not acknowledged by database.');
        }

    } catch (error) {
        console.error('Error in createCommunityDB:', error);
        throw error;
    }
};

const findCommunityByIdDB = async (communityId) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);
        const objectId = new ObjectId(communityId);
        const community = await communitiesCollection.findOne({ _id: objectId });
        return community;
    } catch (error) {
        console.error('Error in findCommunityByIdDB:', error);
        if (error.message.includes('ObjectId')) {
            return null;
        }
        throw error;
    }
};

const updateCommunityDB = async (communityId, updateOperators) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);

        const objectId = new ObjectId(communityId);

        const result = await communitiesCollection.updateOne(
            { _id: objectId },
            updateOperators
        );

        return result.modifiedCount;

    } catch (error) {
        console.error('Error in updateCommunityDB:', error);
        throw error;
    }
};

const deleteCommunityDB = async (communityId) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);
        // Opcional: Eliminar data relacionada en otras colecciones si es necesario (ej. posts asociados, si existieran)
        // await postsCollection.deleteMany({ communityId: new ObjectId(communityId) });


        const objectId = new ObjectId(communityId);
        const result = await communitiesCollection.deleteOne({ _id: objectId });
        return result.deletedCount;
    } catch (error) {
        console.error('Error in deleteCommunityDB:', error);
        throw error;
    }
};

// --- Helper para verificar si un usuario es admin ---
const isCommunityAdmin = (community, userId) => {
    if (!community || !userId || !Array.isArray(community.adminIds)) return false;
    const userIdObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return community.adminIds.some(adminId => adminId.equals(userIdObjectId));
};


// --- Lógica interna para unirse a una comunidad ---
const addCommunityMemberDB = async (communityId, userId) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);

        const communityObjectId = new ObjectId(communityId);
        const userObjectId = new ObjectId(userId);

        // Usar $addToSet para añadir el miembro y $inc para el contador
        // $addToSet es atómico y no añade si ya existe
        const result = await communitiesCollection.updateOne(
            { _id: communityObjectId, memberIds: { $ne: userObjectId } }, // Solo actualizar si el usuario NO es ya miembro
            {
                $addToSet: { memberIds: userObjectId },
                $inc: { memberCount: 1 }
            }
        );

        // modifiedCount será 1 si el usuario NO era miembro y fue añadido
        // modifiedCount será 0 si el usuario YA era miembro
        if (result.modifiedCount === 1) {
            return { status: 'success', message: 'User joined community successfully.' };
        } else {
            // Verificar si el usuario ya era miembro
            const community = await communitiesCollection.findOne(
                 { _id: communityObjectId, memberIds: userObjectId },
                 { projection: { _id: 1 } }
            );
            if (community) {
                return { status: 'conflict', message: 'User is already a member of this community.' };
            } else {
                 // Esto no debería pasar si modifiedCount es 0 y el usuario no es miembro
                 // Podría indicar que la comunidad no se encontró, aunque el $ne en el filtro inicial debería manejarlo.
                 // Mejor verificar si la comunidad existe
                 const communityExists = await communitiesCollection.findOne(
                     { _id: communityObjectId },
                     { projection: { _id: 1 } }
                 );
                 if (!communityExists) {
                      return { status: 'notfound', message: 'Community not found.' };
                 }
                  console.error('Unexpected modifiedCount (0) but user not found in members:', { communityId, userId });
                 throw new Error('Failed to add user to community.');
            }
        }

    } catch (error) {
        console.error('Error in addCommunityMemberDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid community or user ID format.');
         }
        throw error;
    }
};


// --- Lógica interna para salir de una comunidad (miembro saliendo por sí solo) ---
const removeCommunityMemberDB = async (communityId, userId) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);

        const communityObjectId = new ObjectId(communityId);
        const userObjectId = new ObjectId(userId);

        // 1. Obtener la comunidad para verificar el estado del usuario
        const community = await communitiesCollection.findOne(
             { _id: communityObjectId },
             { projection: { creatorId: 1, adminIds: 1, memberIds: 1 } }
        );

        if (!community) {
             return { status: 'notfound', message: 'Community not found.' };
        }

        // El creador no puede salir de la comunidad a través de esta función
        if (community.creatorId.equals(userObjectId)) {
            return { status: 'forbidden', message: 'The creator cannot leave the community.' };
        }

        // 2. Eliminar al usuario del array de miembros y, si es admin, también del array de admins
        // Usar $pull para eliminar el miembro
        const result = await communitiesCollection.updateOne(
            { _id: communityObjectId, memberIds: userObjectId }, // Solo actualizar si el usuario es miembro
            {
                $pull: {
                    memberIds: userObjectId,
                    adminIds: userObjectId // Intentará eliminarlo de admins si está, no falla si no está
                }
            }
        );

        // modifiedCount será 1 si el usuario era miembro y fue eliminado
        // modifiedCount será 0 si el usuario NO era miembro
        if (result.modifiedCount === 1) {
            // Si el usuario fue eliminado, decrementamos el contador de miembros
            await communitiesCollection.updateOne(
                { _id: communityObjectId },
                { $inc: { memberCount: -1 } }
            );
             return { status: 'success', message: 'User left community successfully.' };
        } else {
             // Si modifiedCount es 0, el usuario no era miembro
             return { status: 'notfound', message: 'User is not a member of this community.' };
        }

    } catch (error) {
        console.error('Error in removeCommunityMemberDB (user leaving):', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid community or user ID format.');
         }
        throw error;
    }
};

// --- Lógica interna para añadir un administrador (acción de admin) ---
const addCommunityAdminDB = async (communityId, adminIdToAdd) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);

        const communityObjectId = new ObjectId(communityId);
        const adminObjectIdToAdd = new ObjectId(adminIdToAdd);

        // 1. Verificar que el usuario a añadir es miembro
        const community = await communitiesCollection.findOne(
             { _id: communityObjectId, memberIds: adminObjectIdToAdd }, // Busca la comunidad donde el usuario YA es miembro
             { projection: { _id: 1, adminIds: 1 } }
        );

        if (!community) {
             // Si la comunidad no se encontró con ese miembro, o no existe, o el usuario no es miembro
              const communityExists = await communitiesCollection.findOne(
                  { _id: communityObjectId },
                  { projection: { _id: 1 } }
              );
              if (!communityExists) {
                  return { status: 'notfound', message: 'Community not found.' };
              }
             return { status: 'forbidden', message: 'User must be a member to become an admin.' };
        }

        // 2. Usar $addToSet para añadir el ID al array de admins
        // $addToSet es atómico y no añade si ya existe
        const result = await communitiesCollection.updateOne(
            { _id: communityObjectId, adminIds: { $ne: adminObjectIdToAdd } }, // Solo actualizar si el usuario NO es ya admin
            { $addToSet: { adminIds: adminObjectIdToAdd } }
        );

        // modifiedCount será 1 si el usuario NO era admin y fue añadido
        // modifiedCount será 0 si el usuario YA era admin
        if (result.modifiedCount === 1) {
            return { status: 'success', message: 'User promoted to admin successfully.' };
        } else {
             // Verificar si el usuario ya era admin
             if (community.adminIds.some(id => id.equals(adminObjectIdToAdd))) {
                  return { status: 'conflict', message: 'User is already an admin of this community.' };
             }
              console.error('Unexpected modifiedCount (0) but user not found in admins:', { communityId, adminIdToAdd });
             throw new Error('Failed to add user as admin.');
        }


    } catch (error) {
        console.error('Error in addCommunityAdminDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid community or user ID format.');
         }
        throw error;
    }
};


// --- Lógica interna para eliminar un administrador (acción de admin) ---
const removeCommunityAdminDB = async (communityId, adminIdToRemove) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);

        const communityObjectId = new ObjectId(communityId);
        const adminObjectIdToRemove = new ObjectId(adminIdToRemove);

        // 1. Obtener la comunidad para verificar el estado del usuario a eliminar
        const community = await communitiesCollection.findOne(
             { _id: communityObjectId },
             { projection: { creatorId: 1, adminIds: 1 } }
        );

        if (!community) {
             return { status: 'notfound', message: 'Community not found.' };
        }

        // No puedes eliminar al creador como admin
        if (community.creatorId.equals(adminObjectIdToRemove)) {
             return { status: 'forbidden', message: 'Cannot remove the creator as an admin.' };
        }

        // No puedes eliminar al último admin si hay más de uno (debe quedar al menos 1 admin aparte del creador si el creador es el único admin)
        // Si hay más de un admin Y el usuario a eliminar es uno de ellos, procedemos
        const currentAdminCount = community.adminIds.length;
        const isRemovingCreator = community.creatorId.equals(adminObjectIdToRemove);
        const isRemovingOneOfAdmins = community.adminIds.some(id => id.equals(adminObjectIdToRemove));

        // Si hay solo 1 admin Y ese admin NO es el creador (quien no puede ser eliminado), no puedes eliminarlo
        // O si hay solo 1 admin Y ese admin ES el creador, la condición anterior ya lo prohibió.
        // Si hay más de 1 admin Y el usuario a eliminar es uno de ellos, proceed.
        // Lógica simplificada: Deben quedar al menos 1 admin en el array después de la eliminación, A MENOS QUE el usuario a eliminar sea el creador (cosa que ya prohibimos).
        // Si hay exactamente 1 admin Y ese admin es el que intentamos eliminar, y NO es el creador (ya cubierto), prohibimos.
        if (currentAdminCount === 1 && isRemovingOneOfAdmins && !isRemovingCreator) {
             return { status: 'forbidden', message: 'Cannot remove the last admin.' };
        }
         if (currentAdminCount === 1 && isRemovingOneOfAdmins) {
            // Si solo hay 1 admin y es el que queremos remover, y ese admin es el creador, ya se maneja arriba.
            // Si solo hay 1 admin y es el que queremos remover, y NO es el creador... es el último admin no-creador.
             const isTheLastAdmin = community.adminIds.length === 1 && community.adminIds[0].equals(adminObjectIdToRemove);
             if (isTheLastAdmin && !community.creatorId.equals(adminObjectIdToRemove)) {
                return { status: 'forbidden', message: 'Cannot remove the last admin (except creator).' };
             }
         }
         // Lógica más robusta: Asegurar que el array de admins resultante tendrá al menos un elemento si el elemento a remover está presente.
         const adminsAfterRemoval = community.adminIds.filter(id => !id.equals(adminObjectIdToRemove));
         if (adminsAfterRemoval.length === 0 && community.adminIds.some(id => id.equals(adminObjectIdToRemove))) {
              // Si el usuario a remover estaba en la lista Y después de removerlo la lista queda vacía...
              // Verificar si el creador está en la lista de admins (siempre debería estar)
              const creatorIsInAdmins = community.adminIds.some(id => id.equals(community.creatorId));
              if (!creatorIsInAdmins) {
                   // Esto indicaría un problema de datos, pero si el creador NO está en admins
                   // y vamos a remover al último admin no-creador, no deberíamos permitirlo.
                    console.error('Data inconsistency: Creator not in adminIds for community:', communityId);
                   // Podríamos permitir la eliminación y confiar en la lógica del creador
              }
               // Si el creador está en la lista de admins (debería ser lo normal)
               // y adminsAfterRemoval.length es 0, significa que el usuario a remover es el ÚNICO admin, Y NO es el creador.
               // Esto solo es posible si el creador fue removido ilegalmente o si la lógica de creación falló.
               // Asumimos que el creador SIEMPRE está en admins. Entonces, si adminsAfterRemoval es 0,
               // significa que el único admin era el que estamos removiendo Y NO era el creador. No debería pasar.
               // O significa que el array de admins tenía solo 1 elemento (el que removemos) Y ese elemento NO era el creador.
               // Simplificando: Si la lista de admins tiene 1 elemento Y ese elemento es el que queremos remover, Y ese elemento NO es el creador.
              if (community.adminIds.length === 1 && community.adminIds[0].equals(adminObjectIdToRemove) && !community.creatorId.equals(adminObjectIdToRemove)) {
                 return { status: 'forbidden', message: 'Cannot remove the last admin (except creator).' };
              }
         }
          // Re-chequeo simple: Si después de quitar al usuario, el array de admins queda vacío Y el usuario a quitar SÍ estaba en la lista original
          const wasAdmin = community.adminIds.some(id => id.equals(adminObjectIdToRemove));
          if (wasAdmin && community.adminIds.filter(id => !id.equals(adminObjectIdToRemove)).length === 0) {
              // Esto solo ocurre si el usuario era el único admin. Prohibir a menos que sea el creador (ya prohibido arriba).
              if (!community.creatorId.equals(adminObjectIdToRemove)) {
                 return { status: 'forbidden', message: 'Cannot remove the last admin (except creator).' };
              }
          }


        // 3. Usar $pull para eliminar el ID del array de admins
        const result = await communitiesCollection.updateOne(
            { _id: communityObjectId, adminIds: adminObjectIdToRemove }, // Solo actualizar si el usuario ES admin
            { $pull: { adminIds: adminObjectIdToRemove } }
        );


        // modifiedCount será 1 si el usuario era admin y fue eliminado
        // modifiedCount será 0 si el usuario NO era admin
        if (result.modifiedCount === 1) {
             return { status: 'success', message: 'User removed as admin successfully.' };
        } else {
             // Si modifiedCount es 0, el usuario no era admin
             return { status: 'notfound', message: 'User is not an admin of this community.' };
        }


    } catch (error) {
        console.error('Error in removeCommunityAdminDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid community or user ID format.');
         }
        throw error;
    }
};

// --- Lógica interna para añadir un reto a una comunidad (acción de admin) ---
const addCommunityChallengeDB = async (communityId, challengeIdToAdd) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);
        // Opcional: Importar el controlador de retos para verificar si el reto existe
        // import { findChallengeByIdDB } from './challenge.js';


        const communityObjectId = new ObjectId(communityId);
        const challengeObjectIdToAdd = new ObjectId(challengeIdToAdd);

        // Opcional: Verificar si el reto existe
        // const challengeExists = await findChallengeByIdDB(challengeIdToAdd);
        // if (!challengeExists) {
        //      return { status: 'notfound', message: 'Challenge not found.' };
        // }


        // Usar $addToSet para añadir el ID al array de challengeIds
        // $addToSet es atómico y no añade si ya existe
        const result = await communitiesCollection.updateOne(
            { _id: communityObjectId, challengeIds: { $ne: challengeObjectIdToAdd } }, // Solo actualizar si el reto NO está ya asociado
            { $addToSet: { challengeIds: challengeObjectIdToAdd } }
        );

        // modifiedCount será 1 si el reto NO estaba asociado y fue añadido
        // modifiedCount será 0 si el reto YA estaba asociado
        if (result.modifiedCount === 1) {
            return { status: 'success', message: 'Challenge associated with community successfully.' };
        } else {
             // Verificar si el reto ya estaba asociado
              const community = await communitiesCollection.findOne(
                  { _id: communityObjectId, challengeIds: challengeObjectIdToAdd },
                  { projection: { _id: 1 } }
              );
              if (community) {
                 return { status: 'conflict', message: 'Challenge is already associated with this community.' };
              } else {
                   // Si modifiedCount es 0 y el reto no estaba asociado, la comunidad no se encontró
                   const communityExists = await communitiesCollection.findOne(
                       { _id: communityObjectId },
                       { projection: { _id: 1 } }
                   );
                   if (!communityExists) {
                        return { status: 'notfound', message: 'Community not found.' };
                   }
                    console.error('Unexpected modifiedCount (0) but challenge not found in challengeIds:', { communityId, challengeIdToAdd });
                   throw new Error('Failed to associate challenge with community.');
              }
        }


    } catch (error) {
        console.error('Error in addCommunityChallengeDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid community or challenge ID format.');
         }
        throw error;
    }
};


// --- Lógica interna para eliminar un reto de una comunidad (acción de admin) ---
const removeCommunityChallengeDB = async (communityId, challengeIdToRemove) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);

        const communityObjectId = new ObjectId(communityId);
        const challengeObjectIdToRemove = new ObjectId(challengeIdToRemove);

        // Usar $pull para eliminar el ID del array de challengeIds
        const result = await communitiesCollection.updateOne(
            { _id: communityObjectId, challengeIds: challengeObjectIdToRemove }, // Solo actualizar si el reto ESTÁ asociado
            { $pull: { challengeIds: challengeObjectIdToRemove } }
        );

        // modifiedCount será 1 si el reto ESTABA asociado y fue eliminado
        // modifiedCount será 0 si el reto NO ESTABA asociado
        if (result.modifiedCount === 1) {
             return { status: 'success', message: 'Challenge disassociated from community successfully.' };
        } else {
             // Si modifiedCount es 0, el reto no estaba asociado
              const communityExists = await communitiesCollection.findOne(
                 { _id: communityObjectId },
                 { projection: { _id: 1 } }
             );
              if (!communityExists) {
                   return { status: 'notfound', message: 'Community not found.' };
              }
             return { status: 'notfound', message: 'Challenge was not associated with this community.' };
        }

    } catch (error) {
        console.error('Error in removeCommunityChallengeDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid community or challenge ID format.');
         }
        throw error;
    }
};


// --- Middleware Helper: Verificar si el usuario autenticado es Admin de la comunidad ---
// Esto se puede usar como middleware antes de los controladores que requieren permisos de admin
const isAuthUserCommunityAdmin = async (req, res, next) => {
    try {
        const communityId = req.params.id;
        const userId = req.user.userId; // Asume verifyJWT corrió antes y req.user.userId está disponible

        if (!ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: 'Invalid community ID format.' });
        }
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }


        const community = await findCommunityByIdDB(communityId);

        if (!community) {
            return res.status(404).json({ message: 'Community not found.' });
        }

        // Verificar si el userId está en el array adminIds
        if (!isCommunityAdmin(community, userId)) {
            return res.status(403).json({ message: 'Forbidden: User is not an admin of this community.' });
        }

        // Si es admin, pasar al siguiente middleware o controlador
        req.community = community; // Opcional: adjuntar el objeto comunidad al request para no buscarlo de nuevo
        next();

    } catch (error) {
        console.error('Error in isAuthUserCommunityAdmin middleware:', error);
        res.status(500).json({ message: 'Internal server error during admin check.' });
    }
};


// --- Controladores Exportados ---


// Controlador para manejar la petición POST para crear una comunidad
// Asume verifyJWT corrió antes
// Asume que el middleware de subida de archivo para comunidades corrió antes (req.file)
export const createCommunity = async (req, res) => {
    try {
        const creatorId = req.user.userId;

        // Datos de la comunidad desde el cuerpo de la petición
        const {
            name,
            description,
        } = req.body;

        // Información del archivo subido (asume Multer single('image') ya corrió)
        const communityImageFile = req.file;


        // Validar campos obligatorios (al menos nombre y descripción)
        if (!name || !description) {
             if (communityImageFile) fs.promises.unlink(communityImageFile.path).catch(err => console.error('Error cleaning up file after validation error:', err));
            return res.status(400).json({ message: 'Missing required community fields (name, description).' });
        }

         // Validar el nombre (ej. longitud mínima, caracteres permitidos)
         if (name.length < 3) {
              if (communityImageFile) fs.promises.unlink(communityImageFile.path).catch(err => console.error('Error cleaning up file after name length error:', err));
              return res.status(400).json({ message: 'Community name must be at least 3 characters long.' });
         }


        // La ruta donde Multer guardó el archivo (configurado en el middleware de subida)
        // Queremos guardar la ruta relativa desde imagesBaseDir si existe archivo
        let imagePathToStore = null;
        if(communityImageFile) {
             imagePathToStore = path.relative(imagesBaseDir, communityImageFile.path);
        }


        // Crear el objeto de datos para la nueva comunidad
        const creatorObjectId = new ObjectId(creatorId);
        const newCommunityData = {
            name,
            description,
            image: imagePathToStore, // Puede ser null si no se subió imagen
            creatorId: creatorObjectId,
            // El creador es el primer admin y miembro por defecto
            adminIds: [creatorObjectId],
            memberIds: [creatorObjectId],
            memberCount: 1,
            // challengeIds y createdAt se inicializan por defecto en la clase Community
        };


        // Llamar a la lógica interna de guardado en la DB
        const insertionResult = await createCommunityDB(newCommunityData);

        if (insertionResult && insertionResult.acknowledged) {
            res.status(201).json({
                message: 'Community created successfully.',
                communityId: insertionResult.insertedId,
            });
        } else if (insertionResult && insertionResult.message === 'Community name already exists.') {
             if (communityImageFile) fs.promises.unlink(communityImageFile.path).catch(err => console.error('Error cleaning up file after name conflict error:', err));
             res.status(409).json({ message: insertionResult.message }); // Conflicto si el nombre ya existe
        }
        else {
             console.error('Community creation failed: DB did not acknowledge insertion or unexpected DB logic error.');
              if (communityImageFile) fs.promises.unlink(communityImageFile.path).catch(err => console.error('Error cleaning up file after DB error:', err));
             res.status(500).json({ message: 'Community creation failed due to database issue.' });
        }

    } catch (error) {
        console.error('Error in createCommunity controller:', error);
         if (req.file) fs.promises.unlink(req.file.path).catch(err => console.error('Error cleaning up file on controller error:', err));
        res.status(500).json({ message: 'Internal server error during community creation.' });
    }
};


// Controlador para manejar la petición GET para obtener comunidades paginadas
export const getCommunities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'createdAt'; // Ordenar por fecha de creación por defecto

    const skip = (page - 1) * limit;

    let sortOptions = {};
    if (sort === 'members') { // Opcional: ordenar por número de miembros
        sortOptions = { memberCount: -1, createdAt: -1 }; // Más miembros, desempate por fecha de creación
    }
    else { // createdAt o cualquier otro valor
      sortOptions = { createdAt: -1, _id: -1 }; // Por fecha de creación descendente
    }

    // Proyección mínima para la lista (NO incluimos adminIds, memberIds, challengeIds aquí)
    const projectionOptions = {
      _id: 1,
      name: 1,
      image: 1,
      description: 1,
      memberCount: 1,
      creatorId: 1, // Podrías querer proyectar el creador
      createdAt: 1,
    };

    const communities = await findCommunities(
      {}, // Sin filtro por ahora (ej. por nombre, por miembro, etc.)
      {
        sort: sortOptions,
        skip: skip,
        limit: limit,
        projection: projectionOptions,
      }
    );

    res.status(200).json(communities);

  } catch (error) {
    console.error('Error in getCommunities controller:', error);
    res.status(500).json({ message: 'Internal server error fetching communities.' });
  }
};


// Controlador para manejar la petición GET para obtener una comunidad por ID
// Incluye adminIds, memberIds, challengeIds
export const getCommunityById = async (req, res) => {
    try {
        const communityId = req.params.id;

        if (!ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: 'Invalid community ID format.' });
        }

        const community = await findCommunityByIdDB(communityId);

        if (!community) {
            return res.status(404).json({ message: 'Community not found.' });
        }

        res.status(200).json(community);

    } catch (error) {
        console.error('Error in getCommunityById controller:', error);
        res.status(500).json({ message: 'Internal server error fetching community.' });
    }
};


// Controlador para manejar la petición PATCH para actualizar una comunidad (solo admins)
// Asume verifyJWT y isAuthUserCommunityAdmin corrieron antes
// Asume que el middleware de subida de archivo corrió antes (req.file si se sube nueva imagen)
export const updateCommunity = async (req, res) => {
    try {
        const communityId = req.params.id;
        // communityToUpdate está disponible en req.community si usas el middleware isAuthUserCommunityAdmin
        const communityToUpdate = req.community || await findCommunityByIdDB(communityId); // Fallback por si no usas el middleware helper

        if (!communityToUpdate) {
             // Esto no debería pasar si usas el middleware isAuthUserCommunityAdmin que verifica si existe
             return res.status(404).json({ message: 'Community not found.' });
        }

        // La verificación de permisos de admin ya la hizo el middleware isAuthUserCommunityAdmin si lo usaste

        // 1. Preparar los operadores de actualización
        const updateOperators = {};
        const setOperator = {};
        const unsetOperator = {}; // Para eliminar la imagen si se quita

        // Campos permitidos en el body (solo name y description)
        const {
            name,
            description,
        } = req.body;

        if (name !== undefined) {
            if (typeof name !== 'string' || name.length === 0) {
                 return res.status(400).json({ message: 'Name must be a non-empty string.' });
            }
             // Opcional: Verificar unicidad del nombre al actualizar si el nombre ha cambiado
             if (name !== communityToUpdate.name) {
                  const existingCommunity = await findCommunities({ name: name }, { projection: { _id: 1 } });
                  if (existingCommunity.length > 0 && existingCommunity[0]._id.toString() !== communityId) {
                      return res.status(409).json({ message: 'Community name already exists.' });
                  }
             }
            setOperator.name = name;
        }

        if (description !== undefined) {
            if (typeof description !== 'string') {
                 return res.status(400).json({ message: 'Description must be a string.' });
            }
            setOperator.description = description;
        }

        // Manejo de la imagen: Puede venir una nueva (req.file) o indicarse eliminar la existente
        const newCommunityImageFile = req.file; // Multer single('image')
        const deleteExistingImage = req.body.deleteExistingImage === 'true'; // Asume que el body puede tener este campo

        if (newCommunityImageFile) {
            // Si hay una nueva imagen subida, la establecemos y planeamos borrar la antigua si existía
            const newImagePathToStore = path.relative(imagesBaseDir, newCommunityImageFile.path); // Guarda la ruta relativa
            setOperator.image = newImagePathToStore;

             // Si existía una imagen antigua, planear borrarla DESPUÉS de la actualización de la DB
             if (communityToUpdate.image) {
                 const oldImagePhysicalPath = path.join(imagesBaseDir, communityToUpdate.image); // Reconstruye la ruta física
                 fs.promises.unlink(oldImagePhysicalPath).catch(err => {
                     console.error('Error deleting old community image:', oldImagePhysicalPath, err);
                 });
            }
        } else if (deleteExistingImage && communityToUpdate.image) {
            // Si se indica eliminar la imagen existente y había una
            unsetOperator.image = ""; // Usar $unset para eliminar el campo 'image' en DB
             // Planear borrar la imagen física antigua
             const oldImagePhysicalPath = path.join(imagesBaseDir, communityToUpdate.image); // Reconstruye la ruta física
             fs.promises.unlink(oldImagePhysicalPath).catch(err => {
                 console.error('Error deleting community image marked for deletion:', oldImagePhysicalPath, err);
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
             if (newCommunityImageFile) {
                 const newImagePhysicalPath = newCommunityImageFile.path || newCommunityImageFile.location; // Esta sí es la ruta física completa de Multer
                  fs.promises.unlink(newImagePhysicalPath).catch(err => {
                       console.error('Error deleting unused uploaded new image:', newImagePhysicalPath, err);
                  });
             }
             return res.status(200).json({ message: 'No updatable fields or new image provided.' });
        }


        // 4. Llamar a la lógica interna de actualización en la DB
        const modifiedCount = await updateCommunityDB(communityId, updateOperators);

        // 5. Verificar el resultado de la actualización
        if (modifiedCount === 1) {
            res.status(200).json({ message: 'Community updated successfully.' });
        } else {
             // Esto puede pasar si la comunidad fue encontrada pero los operadores no causaron ningún cambio real en la DB
             console.error('Community update in DB resulted in unexpected modifiedCount:', modifiedCount, 'for community ID:', communityId);
             res.status(200).json({ message: 'Community found, but no changes were made or update failed.' });
        }

    } catch (error) {
        console.error('Error in updateCommunity controller:', error);
         // Si el error ocurrió DESPUÉS de subir una nueva imagen, esa imagen es huérfana.
         if (req.file) {
              const orphanedImagePhysicalPath = req.file.path;
              fs.promises.unlink(orphanedImagePhysicalPath).catch(cleanupErr => {
                   console.error('Error cleaning up orphaned uploaded image after controller error:', orphanedImagePhysicalPath, cleanupErr);
              });
         }
        res.status(500).json({ message: 'Internal server error during community update.' });
    }
};


// Controlador para manejar la petición DELETE para eliminar una comunidad (solo creador)
// Asume verifyJWT corrió antes
export const deleteCommunity = async (req, res) => {
    try {
        const communityId = req.params.id;

        if (!ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: 'Invalid community ID format.' });
        }

        const authenticatedUserId = req.user.userId;

        // 1. Buscar la comunidad existente
        const communityToDelete = await findCommunityByIdDB(communityId);

        if (!communityToDelete) {
            return res.status(404).json({ message: 'Community not found.' });
        }

        // 2. Verificar si el usuario autenticado es el creador
        if (communityToDelete.creatorId.toString() !== new ObjectId(authenticatedUserId).toString()) {
            return res.status(403).json({ message: 'Forbidden: Only the creator can delete this community.' });
        }

        // 3. Si el usuario es el creador, proceder a eliminar el archivo físico de la imagen
        if (communityToDelete.image) {
             const imagePhysicalPath = path.join(imagesBaseDir, communityToDelete.image); // Reconstruye la ruta física
             fs.promises.unlink(imagePhysicalPath).catch(err => {
                 console.error('Error deleting community image during delete:', imagePhysicalPath, err);
             });
        }

        // 4. Eliminar el documento de la comunidad de la base de datos
        const deletedCount = await deleteCommunityDB(communityId);

        // 5. Verificar si el documento fue eliminado en la DB
        if (deletedCount === 1) {
            res.status(200).json({ message: 'Community deleted successfully.' });
        } else {
             console.error('Community delete in DB failed, document not found after initial find:', communityId);
             res.status(500).json({ message: 'Community deletion failed in database.' });
        }

    } catch (error) {
        console.error('Error in deleteCommunity controller:', error);
        res.status(500).json({ message: 'Internal server error during community deletion.' });
    }
};


// Controlador para que un usuario se una a una comunidad (requiere auth)
// Asume verifyJWT corrió antes
export const joinCommunity = async (req, res) => {
    try {
        const communityId = req.params.id;
        const userId = req.user.userId;

         if (!ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: 'Invalid community ID format.' });
        }
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const result = await addCommunityMemberDB(communityId, userId);

        if (result.status === 'success') {
            res.status(200).json({ message: result.message });
        } else if (result.status === 'notfound') {
             res.status(404).json({ message: result.message });
        } else if (result.status === 'conflict') {
            res.status(409).json({ message: result.message });
        } else {
             console.error('Unexpected result status from addCommunityMemberDB:', result);
             res.status(500).json({ message: 'Internal server error during joining community.' });
        }

    } catch (error) {
        console.error('Error in joinCommunity controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during join operation.' });
    }
};


// Controlador para que un usuario salga de una comunidad (requiere auth)
// Asume verifyJWT corrió antes
export const leaveCommunity = async (req, res) => {
     try {
        const communityId = req.params.id;
        const userId = req.user.userId;

         if (!ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: 'Invalid community ID format.' });
        }
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const result = await removeCommunityMemberDB(communityId, userId);

         if (result.status === 'success') {
            res.status(200).json({ message: result.message });
        } else if (result.status === 'notfound') {
            res.status(404).json({ message: result.message });
        } else if (result.status === 'forbidden') {
            res.status(403).json({ message: result.message });
        } else {
             console.error('Unexpected result status from removeCommunityMemberDB:', result);
             res.status(500).json({ message: 'Internal server error during leaving community.' });
        }


    } catch (error) {
        console.error('Error in leaveCommunity controller:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid community or user ID format.');
         }
        res.status(500).json({ message: 'Internal server error during leave operation.' });
    }
};


// Controlador para que un Admin elimine a un miembro (requiere auth y admin)
// Asume verifyJWT y isAuthUserCommunityAdmin corrieron antes
export const removeMember = async (req, res) => {
    try {
        const communityId = req.params.id;
        const memberIdToRemove = req.params.memberId; // ID del miembro a eliminar

        // communityToUpdate está disponible en req.community si usas el middleware isAuthUserCommunityAdmin
        const community = req.community || await findCommunityByIdDB(communityId); // Fallback


         if (!ObjectId.isValid(memberIdToRemove)) {
            return res.status(400).json({ message: 'Invalid member ID format.' });
        }

        // La verificación de permisos de admin ya la hizo el middleware isAuthUserCommunityAdmin
        // La comunidad ya se cargó

        // 1. Verificar que el miembro a eliminar no sea el creador
        const memberObjectIdToRemove = new ObjectId(memberIdToRemove);
        if (community.creatorId.equals(memberObjectIdToRemove)) {
             return res.status(403).json({ message: 'Forbidden: Cannot remove the creator from the community.' });
        }

         // 2. Verificar que el admin que hace la petición no se elimine a sí mismo (complejo)
         // req.user.userId es el admin. memberIdToRemove es el usuario a eliminar.
         if (new ObjectId(req.user.userId).equals(memberObjectIdToRemove)) {
             return res.status(400).json({ message: 'Bad Request: Cannot remove yourself as a member using this endpoint.' });
             // Deberían usar el endpoint de dejar la comunidad (leaveCommunity) si quieren salir
         }


        // 3. Eliminar al miembro del array de miembros y, si es admin, también de admins
        const result = await communitiesCollection.updateOne(
            { _id: community._id, memberIds: memberObjectIdToRemove }, // Solo actualizar si el usuario ES miembro
            {
                $pull: {
                    memberIds: memberObjectIdToRemove,
                    adminIds: memberObjectIdToRemove // Intentará eliminarlo de admins si está
                }
            }
        );

        // modifiedCount será 1 si el usuario era miembro y fue eliminado
        // modifiedCount será 0 si el usuario NO era miembro
        if (result.modifiedCount === 1) {
            // Si el miembro fue eliminado, decrementamos el contador
            await communitiesCollection.updateOne(
                { _id: community._id },
                { $inc: { memberCount: -1 } }
            );
             res.status(200).json({ message: 'Member removed successfully.' });
        } else {
             // Si modifiedCount es 0, el usuario no era miembro
              const communityExists = await findCommunityByIdDB(communityId); // Re-verificar si la comunidad existe
              if (!communityExists) {
                   return res.status(404).json({ message: 'Community not found.' });
              }
             res.status(404).json({ message: 'User is not a member of this community.' });
        }


    } catch (error) {
        console.error('Error in removeMember controller:', error);
        res.status(500).json({ message: 'Internal server error during removing member.' });
    }
};


// Controlador para que un Admin añada a otro miembro como Admin (requiere auth y admin)
// Asume verifyJWT y isAuthUserCommunityAdmin corrieron antes
export const addAdmin = async (req, res) => {
    try {
        const communityId = req.params.id;
        const userIdToAddAsAdmin = req.params.userId; // ID del usuario a promover

        // community está disponible en req.community si usas el middleware isAuthUserCommunityAdmin
        const community = req.community || await findCommunityByIdDB(communityId); // Fallback

         if (!ObjectId.isValid(userIdToAddAsAdmin)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }

        // La verificación de permisos de admin ya la hizo el middleware isAuthUserCommunityAdmin
        // La comunidad ya se cargó

         const userObjectIdToAddAsAdmin = new ObjectId(userIdToAddAsAdmin);

        // 1. Verificar que el usuario a promover sea miembro
        if (!community.memberIds.some(memberId => memberId.equals(userObjectIdToAddAsAdmin))) {
             return res.status(403).json({ message: 'Forbidden: User must be a member to become an admin.' });
        }

        // 2. Llamar a la lógica interna para añadir admin
        const result = await addCommunityAdminDB(communityId, userIdToAddAsAdmin);

        if (result.status === 'success') {
            res.status(200).json({ message: result.message });
        } else if (result.status === 'notfound') {
             res.status(404).json({ message: result.message });
        } else if (result.status === 'forbidden') {
            res.status(403).json({ message: result.message });
        } else if (result.status === 'conflict') {
             res.status(409).json({ message: result.message });
        } else {
             console.error('Unexpected result status from addCommunityAdminDB:', result);
             res.status(500).json({ message: 'Internal server error during adding admin.' });
        }

    } catch (error) {
        console.error('Error in addAdmin controller:', error);
        res.status(500).json({ message: 'Internal server error during add admin operation.' });
    }
};


// Controlador para que un Admin elimine a otro Admin (requiere auth y admin)
// Asume verifyJWT y isAuthUserCommunityAdmin corrieron antes
export const removeAdmin = async (req, res) => {
    try {
        const communityId = req.params.id;
        const adminIdToRemove = req.params.userId; // ID del usuario a degradar

        // community está disponible en req.community si usas el middleware isAuthUserCommunityAdmin
        const community = req.community || await findCommunityByIdDB(communityId); // Fallback

         if (!ObjectId.isValid(adminIdToRemove)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }

        // La verificación de permisos de admin ya la hizo el middleware isAuthUserCommunityAdmin
        // La comunidad ya se cargó

         const adminObjectIdToRemove = new ObjectId(adminIdToRemove);

        // 1. Verificar que el usuario a eliminar no sea el creador
        if (community.creatorId.equals(adminObjectIdToRemove)) {
             return res.status(403).json({ message: 'Forbidden: Cannot remove the creator as an admin.' });
        }

         // 2. Verificar que el admin que hace la petición no se elimine a sí mismo
         if (new ObjectId(req.user.userId).equals(adminObjectIdToRemove)) {
              return res.status(400).json({ message: 'Bad Request: Cannot remove yourself as an admin.' });
         }

        // 3. Llamar a la lógica interna para eliminar admin
        const result = await removeCommunityAdminDB(communityId, adminIdToRemove);


        if (result.status === 'success') {
            res.status(200).json({ message: result.message });
        } else if (result.status === 'notfound') {
             res.status(404).json({ message: result.message });
        } else if (result.status === 'forbidden') {
            res.status(403).json({ message: result.message });
        } else {
             console.error('Unexpected result status from removeCommunityAdminDB:', result);
             res.status(500).json({ message: 'Internal server error during removing admin.' });
        }


    } catch (error) {
        console.error('Error in removeAdmin controller:', error);
        res.status(500).json({ message: 'Internal server error during remove admin operation.' });
    }
};


// Controlador para que un Admin añada un reto a la comunidad (requiere auth y admin)
// Asume verifyJWT y isAuthUserCommunityAdmin corrieron antes
export const addChallengeToCommunity = async (req, res) => {
    try {
        const communityId = req.params.id;
        const challengeIdToAdd = req.params.challengeId; // ID del reto a añadir

        // community está disponible en req.community si usas el middleware isAuthUserCommunityAdmin
        const community = req.community || await findCommunityByIdDB(communityId); // Fallback

         if (!ObjectId.isValid(challengeIdToAdd)) {
            return res.status(400).json({ message: 'Invalid challenge ID format.' });
        }

        // La verificación de permisos de admin ya la hizo el middleware isAuthUserCommunityAdmin
        // La comunidad ya se cargó

        // 1. Llamar a la lógica interna para añadir reto
        const result = await addCommunityChallengeDB(communityId, challengeIdToAdd);

        if (result.status === 'success') {
            res.status(200).json({ message: result.message });
        } else if (result.status === 'notfound') {
             res.status(404).json({ message: result.message });
        } else if (result.status === 'conflict') {
             res.status(409).json({ message: result.message });
        } else {
             console.error('Unexpected result status from addCommunityChallengeDB:', result);
             res.status(500).json({ message: 'Internal server error during adding challenge to community.' });
        }


    } catch (error) {
        console.error('Error in addChallengeToCommunity controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during add challenge operation.' });
    }
};


// Controlador para que un Admin elimine un reto de la comunidad (requiere auth y admin)
// Asume verifyJWT y isAuthUserCommunityAdmin corrieron antes
export const removeChallengeFromCommunity = async (req, res) => {
    try {
        const communityId = req.params.id;
        const challengeIdToRemove = req.params.challengeId; // ID del reto a eliminar

        // community está disponible en req.community si usas el middleware isAuthUserCommunityAdmin
        const community = req.community || await findCommunityByIdDB(communityId); // Fallback

         if (!ObjectId.isValid(challengeIdToRemove)) {
            return res.status(400).json({ message: 'Invalid challenge ID format.' });
        }

        // La verificación de permisos de admin ya la hizo el middleware isAuthUserCommunityAdmin
        // La comunidad ya se cargó

        // 1. Llamar a la lógica interna para eliminar reto
        const result = await removeCommunityChallengeDB(communityId, challengeIdToRemove);

        if (result.status === 'success') {
            res.status(200).json({ message: result.message });
        } else if (result.status === 'notfound') {
             res.status(404).json({ message: result.message });
        } else {
             console.error('Unexpected result status from removeCommunityChallengeDB:', result);
             res.status(500).json({ message: 'Internal server error during removing challenge from community.' });
        }


    } catch (error) {
        console.error('Error in removeChallengeFromCommunity controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during remove challenge operation.' });
    }
};


// Opcional: Controlador para obtener la lista de miembros de una comunidad (proyectando solo IDs)
export const getCommunityMembers = async (req, res) => {
    try {
        const communityId = req.params.id;

         if (!ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: 'Invalid community ID format.' });
        }

        const community = await findCommunityByIdDB(communityId);
        if (!community) {
             return res.status(404).json({ message: 'Community not found.' });
        }

        // Devolvemos solo los IDs. Si necesitas info completa del usuario, tendrías que hacer una aggregation.
        res.status(200).json(community.memberIds || []);

    } catch (error) {
        console.error('Error in getCommunityMembers controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching community members.' });
    }
};


// Opcional: Controlador para obtener la lista de administradores de una comunidad (proyectando solo IDs)
export const getCommunityAdmins = async (req, res) => {
    try {
        const communityId = req.params.id;

         if (!ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: 'Invalid community ID format.' });
        }

        const community = await findCommunityByIdDB(communityId);
        if (!community) {
             return res.status(404).json({ message: 'Community not found.' });
        }

        // Devolvemos solo los IDs
        res.status(200).json(community.adminIds || []);

    } catch (error) {
        console.error('Error in getCommunityAdmins controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching community admins.' });
    }
};


// Opcional: Controlador para obtener la lista de IDs de retos asociados a una comunidad
export const getCommunityChallenges = async (req, res) => {
    try {
        const communityId = req.params.id;

         if (!ObjectId.isValid(communityId)) {
            return res.status(400).json({ message: 'Invalid community ID format.' });
        }

        const community = await findCommunityByIdDB(communityId);
        if (!community) {
             return res.status(404).json({ message: 'Community not found.' });
        }

        // Devolvemos solo los IDs de retos
        res.status(200).json(community.challengeIds || []);

    } catch (error) {
        console.error('Error in getCommunityChallenges controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching community challenges.' });
    }
};