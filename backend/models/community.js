import { ObjectId } from 'mongodb';

export class Community {
  constructor(data) {
    this._id = data._id ? new ObjectId(data._id) : new ObjectId();
    this.name = data.name || '';
    this.image = data.image || null;
    this.description = data.description || '';
    this.memberCount = data.memberCount !== undefined ? data.memberCount : 0;
    this.adminIds = Array.isArray(data.adminIds) ? data.adminIds.map(id => new ObjectId(id)) : [];
    this.memberIds = Array.isArray(data.memberIds) ? data.memberIds.map(id => new ObjectId(id)) : [];
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.challengeIds = Array.isArray(data.challengeIds) ? data.challengeIds.map(id => new ObjectId(id)) : [];
    this.creatorId = data.creatorId ? new ObjectId(data.creatorId) : null; // El creador siempre es el primer admin
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  get image() {
    return this._image;
  }

  get description() {
    return this._description;
  }

  get memberCount() {
    return this._memberCount;
  }

  get adminIds() {
    return this._adminIds;
  }

  get memberIds() {
    return this._memberIds;
  }

  get createdAt() {
    return this._createdAt;
  }

  get challengeIds() {
    return this._challengeIds;
  }

  get creatorId() {
    return this._creatorId;
  }

  set id(value) {
    this._id = value ? new ObjectId(value) : new ObjectId();
  }

  set name(value) {
    if (typeof value !== 'string' || value.length === 0) throw new Error('Name must be a non-empty string.');
    this._name = value;
  }

  set image(value) {
    this._image = value;
  }

  set description(value) {
    if (typeof value !== 'string') throw new Error('Description must be a string.');
    this._description = value;
  }

  set memberCount(value) {
    if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) throw new Error('Member count must be a non-negative integer.');
    this._memberCount = value;
  }

  set adminIds(values) {
    if (!Array.isArray(values)) throw new Error('Admin IDs must be an array.');
    this._adminIds = values.map(id => new ObjectId(id)); // Asegura que sean ObjectIds
  }

  set memberIds(values) {
    if (!Array.isArray(values)) throw new Error('Member IDs must be an array.');
    this._memberIds = values.map(id => new ObjectId(id)); // Asegura que sean ObjectIds
  }

  set createdAt(value) {
    if (!(value instanceof Date)) throw new Error('createdAt must be a Date object.');
    this._createdAt = value;
  }

  set challengeIds(values) {
    if (!Array.isArray(values)) throw new Error('Challenge IDs must be an array.');
    this._challengeIds = values.map(id => new ObjectId(id)); // Asegura que sean ObjectIds
  }

  set creatorId(value) {
      this._creatorId = value ? new ObjectId(value) : null;
  }

  toDocument() {
      return {
          _id: this._id,
          name: this._name,
          image: this._image,
          description: this._description,
          memberCount: this._memberCount,
          adminIds: this._adminIds,
          memberIds: this._memberIds,
          createdAt: this._createdAt,
          challengeIds: this._challengeIds,
          creatorId: this._creatorId,
      };
  }
}