import { ObjectId } from 'mongodb';

export class Post {
  constructor(data) {
    this._id = data._id ? new ObjectId(data._id) : new ObjectId();
    this.title = data.title || '';
    this.photo = data.photo || null;
    this.date = data.date ? new Date(data.date) : new Date();
    this.likes = data.likes !== undefined ? data.likes : 0;
    this.creatorId = data.creatorId ? new ObjectId(data.creatorId) : null;
    this.routeId = data.routeId ? new ObjectId(data.routeId) : null;
  }

  get id() {
    return this._id;
  }

  get title() {
    return this._title;
  }

  get photo() {
    return this._photo;
  }

  get date() {
    return this._date;
  }

  get likes() {
    return this._likes;
  }

  get creatorId() {
    return this._creatorId;
  }

  get routeId() {
    return this._routeId;
  }

  set id(value) {
    this._id = value ? new ObjectId(value) : new ObjectId();
  }

  set title(value) {
    if (typeof value !== 'string') throw new Error('Title must be a string.');
    this._title = value;
  }

  set photo(value) {
    this._photo = value;
  }

  set date(value) {
      if (!(value instanceof Date)) throw new Error('Date must be a Date object.');
    this._date = value;
  }

  set likes(value) {
     if (typeof value !== 'number' || value < 0) throw new Error('Likes must be a non-negative number.');
     this._likes = value;
   }

  set creatorId(value) {
    this._creatorId = value ? new ObjectId(value) : null;
  }

  set routeId(value) {
    this._routeId = value ? new ObjectId(value) : null;
  }

  toDocument() {
      return {
          _id: this._id,
          title: this._title,
          photo: this._photo,
          date: this._date,
          likes: this._likes,
          creatorId: this._creatorId,
          routeId: this._routeId
      };
  }
}