import { ObjectId } from 'mongodb';

export class Challenge {
  constructor(data) {
    this._id = data._id ? new ObjectId(data._id) : new ObjectId();
    this.title = data.title || '';
    this.image = data.image || null;
    this.description = data.description || '';
    this.startDate = data.startDate ? new Date(data.startDate) : null;
    this.endDate = data.endDate ? new Date(data.endDate) : null;
    this.maxParticipants = data.maxParticipants !== undefined ? data.maxParticipants : null; // null para ilimitado? O 0? Pongamos null para ilimitado.
    this.creatorId = data.creatorId ? new ObjectId(data.creatorId) : null;
    this.currentParticipants = data.currentParticipants !== undefined ? data.currentParticipants : 0;
    this.status = data.status || 'open'; // Ej: 'open', 'closed', 'active', 'finished'
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date(); // Fecha de creación del documento
  }

  get id() {
    return this._id;
  }

  get title() {
    return this._title;
  }

  get image() {
    return this._image;
  }

  get description() {
    return this._description;
  }

  get startDate() {
    return this._startDate;
  }

  get endDate() {
    return this._endDate;
  }

  get maxParticipants() {
    return this._maxParticipants;
  }

  get creatorId() {
    return this._creatorId;
  }

  get currentParticipants() {
      return this._currentParticipants;
  }

  get status() {
      return this._status;
  }

  get createdAt() {
      return this._createdAt;
  }

  set id(value) {
    this._id = value ? new ObjectId(value) : new ObjectId();
  }

  set title(value) {
    if (typeof value !== 'string') throw new Error('Title must be a string.');
    this._title = value;
  }

  set image(value) {
    this._image = value;
  }

  set description(value) {
    if (typeof value !== 'string') throw new Error('Description must be a string.');
    this._description = value;
  }

  set startDate(value) {
      if (value !== null && !(value instanceof Date)) throw new Error('startDate must be a Date object or null.');
      this._startDate = value;
  }

  set endDate(value) {
       if (value !== null && !(value instanceof Date)) throw new Error('endDate must be a Date object or null.');
       this._endDate = value;
   }

  set maxParticipants(value) {
      if (value !== null && (typeof value !== 'number' || value < 0 || !Number.isInteger(value))) throw new Error('maxParticipants must be a non-negative integer or null.');
      this._maxParticipants = value;
  }

  set creatorId(value) {
      this._creatorId = value ? new ObjectId(value) : null;
  }

  set currentParticipants(value) {
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) throw new Error('currentParticipants must be a non-negative integer.');
      this._currentParticipants = value;
  }

  set status(value) {
      if (typeof value !== 'string') throw new Error('Status must be a string.');
      this._status = value;
  }

  set createdAt(value) {
      if (!(value instanceof Date)) throw new Error('createdAt must be a Date object.');
      this._createdAt = value;
  }


  toDocument() {
      return {
          _id: this._id,
          title: this._title,
          image: this._image,
          description: this._description,
          startDate: this._startDate,
          endDate: this._endDate,
          maxParticipants: this._maxParticipants,
          creatorId: this._creatorId,
          currentParticipants: this._currentParticipants,
          status: this._status,
          createdAt: this._createdAt,
      };
  }
}