import { ObjectId } from 'mongodb';

export class Profile {
  constructor(data) {
    this._id = data._id ? new ObjectId(data._id) : new new ObjectId();
    this.username = data.username || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.avatarUrl = data.avatarUrl || null;
    this.biography = data.biography || '';
  }

  get id() {
    return this._id;
  }

  get username() {
      return this._username;
  }

  get email() {
    return this._email;
  }

  get password() {
    return this._password;
  }

  get avatarUrl() {
    return this._avatarUrl;
  }

  get biography() {
    return this._biography;
  }

  set id(value) {
     this._id = value ? new ObjectId(value) : new ObjectId();
  }

  set username(value) {
    if (typeof value !== 'string' || value.length === 0) throw new Error('Username must be a non-empty string.');
    this._username = value;
  }

  set email(value) {
    if (typeof value !== 'string' || !value.includes('@')) throw new Error('Invalid email format.');
    this._email = value;
  }

  set password(value) {
    if (typeof value !== 'string') throw new Error('Password must be a string.');
    this._password = value;
  }

  set avatarUrl(value) {
    this._avatarUrl = value;
  }

  set biography(value) {
    this._biography = value;
  }

  toDocument() {
      return {
          _id: this._id,
          username: this._username,
          email: this._email,
          password: this._password,
          avatarUrl: this._avatarUrl,
          biography: this._biography,
      };
  }

   toPublicProfile() {
        return {
            _id: this._id,
            username: this._username,
            avatarUrl: this._avatarUrl,
            biography: this._biography,
        };
   }
}