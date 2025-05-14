import { ObjectId } from 'mongodb';

export class Route {
  constructor(data) {
    this._id = data._id ? new ObjectId(data._id) : new ObjectId();
    this.title = data.title || '';
    this.description = data.description || '';
    this.images = Array.isArray(data.images) ? data.images : [];
    this.videos = Array.isArray(data.videos) ? data.videos : [];
    this.difficultyLevel = data.difficultyLevel || '';
    this.geoLocation = data.geoLocation || null;
    this.accessCost = data.accessCost !== undefined ? data.accessCost : 0;
    this.climbType = data.climbType || '';
    this.recommendedGear = data.recommendedGear || '';

    this.likes = data.likes !== undefined ? data.likes : 0;
    this.climbedCount = data.climbedCount !== undefined ? data.climbedCount : 0;
    this.attemptedCount = data.attemptedCount !== undefined ? data.attemptedCount : 0;

    this.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : new Date();
    this.creatorId = data.creatorId ? new ObjectId(data.creatorId) : null;
  }

  get id() {
    return this._id;
  }

  get title() {
    return this._title;
  }

  get description() {
    return this._description;
  }

  get images() {
    return this._images;
  }

  get videos() {
    return this._videos;
  }

  get difficultyLevel() {
    return this._difficultyLevel;
  }

  get geoLocation() {
    return this._geoLocation;
  }

  get accessCost() {
    return this._accessCost;
  }

  get climbType() {
    return this._climbType;
  }

  get recommendedGear() {
    return this._recommendedGear;
  }

  get lastUpdated() {
    return this._lastUpdated;
  }

  get creatorId() {
    return this._creatorId;
  }

  get likes() {
    return this._likes;
  }

  get climbedCount() {
    return this._climbedCount;
  }

  get attemptedCount() {
    return this._attemptedCount;
  }


  set id(value) {
    this._id = value ? new ObjectId(value) : new ObjectId();
  }

  set title(value) {
    if (typeof value !== 'string') throw new Error('Title must be a string.');
    this._title = value;
  }

  set description(value) {
     if (typeof value !== 'string') throw new Error('Description must be a string.');
    this._description = value;
  }

  set images(value) {
    if (!Array.isArray(value)) throw new Error('Images must be an array.');
    this._images = value;
  }

   set videos(value) {
    if (!Array.isArray(value)) throw new Error('Videos must be an array.');
    this._videos = value;
  }

  set difficultyLevel(value) {
    this._difficultyLevel = value;
  }

  set geoLocation(value) {
    this._geoLocation = value;
  }

   set accessCost(value) {
     if (typeof value !== 'number' || value < 0) throw new Error('Cost must be a non-negative number.');
    this._accessCost = value;
  }

  set climbType(value) {
    this._climbType = value;
  }

   set recommendedGear(value) {
     if (typeof value !== 'string') throw new Error('Recommended equipment must be a string.');
    this._recommendedGear = value;
  }

   set lastUpdated(value) {
      if (!(value instanceof Date)) throw new Error('Last update date must be a Date object.');
    this._lastUpdated = value;
  }

  set creatorId(value) {
    this._creatorId = value ? new ObjectId(value) : null;
  }

   set likes(value) {
     if (typeof value !== 'number' || value < 0) throw new Error('Likes must be a non-negative number.');
     this._likes = value;
   }

   set climbedCount(value) {
     if (typeof value !== 'number' || value < 0) throw new Error('Climbed count must be a non-negative number.');
     this._climbedCount = value;
   }

   set attemptedCount(value) {
     if (typeof value !== 'number' || value < 0) throw new Error('Attempted count must be a non-negative number.');
     this._attemptedCount = value;
   }


  toDocument() {
      return {
          _id: this._id,
          title: this._title,
          description: this._description,
          images: this._images,
          videos: this._videos,
          difficultyLevel: this._difficultyLevel,
          geoLocation: this._geoLocation,
          accessCost: this._accessCost,
          climbType: this._climbType,
          recommendedGear: this._recommendedGear,
          likes: this._likes,
          climbedCount: this._climbedCount,
          attemptedCount: this._attemptedCount,
          lastUpdated: this._lastUpdated,
          creatorId: this._creatorId
      };
  }
}